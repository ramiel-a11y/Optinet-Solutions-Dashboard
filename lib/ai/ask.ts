import { SCHEMA_CONTEXT } from './schemaContext';
import { runReadOnlyQuery } from './queryDb';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const MAX_TOOL_ITERS = 5;

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type AskResult = { ok: true; answer: string } | { ok: false; error: string };

type OAMessage = Record<string, unknown>;
type ToolCall = { id: string; function?: { name?: string; arguments?: string } };
type OAResponse = {
  choices?: { message?: { content?: string | null; tool_calls?: ToolCall[] } }[];
  error?: { message?: string };
};

const SYSTEM_PROMPT = `You are the Ask AI assistant for the Optinet Solutions company dashboard.
Answer questions about the company's data (revenue, expenses, invoices, clients, team, assets).
Use the query_database tool to run read-only PostgreSQL SELECT queries. Prefer aggregates
(SUM, COUNT, AVG, GROUP BY) over dumping raw rows. Always filter "deleted_at IS NULL".
Values in *_eur columns are already in EUR — present money with a € sign and thousands
separators. If a question is ambiguous, make a reasonable assumption and state it. If the
data cannot answer it, say so briefly. Keep answers concise. Never attempt to modify data.

${SCHEMA_CONTEXT}`;

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'query_database',
      description: 'Run a read-only PostgreSQL SELECT query against the dashboard database and get rows back as JSON.',
      parameters: {
        type: 'object',
        properties: {
          sql: { type: 'string', description: 'A single read-only SELECT (or WITH) statement.' },
        },
        required: ['sql'],
      },
    },
  },
];

export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function askAi(question: string, history: ChatMessage[] = []): Promise<AskResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: 'not_configured' };

  const messages: OAMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-6).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: question },
  ];

  for (let i = 0; i < MAX_TOOL_ITERS; i++) {
    const res = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, temperature: 0.1 }),
    });
    const data = (await res.json().catch(() => ({}))) as OAResponse;
    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `OpenAI request failed (${res.status}).` };
    }
    const msg = data.choices?.[0]?.message;
    if (!msg) return { ok: false, error: 'No response from the model.' };
    messages.push(msg as OAMessage);

    const toolCalls = msg.tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      const answer = (msg.content ?? '').trim();
      return { ok: true, answer: answer || 'I could not find an answer to that.' };
    }

    for (const tc of toolCalls) {
      let content: string;
      if (tc.function?.name === 'query_database') {
        let sql = '';
        try { sql = String(JSON.parse(tc.function.arguments ?? '{}').sql ?? ''); } catch { sql = ''; }
        const r = await runReadOnlyQuery(sql);
        content = r.ok ? JSON.stringify({ rows: r.rows, truncated: r.truncated }) : JSON.stringify({ error: r.error });
      } else {
        content = JSON.stringify({ error: 'unknown tool' });
      }
      messages.push({ role: 'tool', tool_call_id: tc.id, content });
    }
  }

  return { ok: false, error: 'The assistant took too many steps. Please refine your question.' };
}
