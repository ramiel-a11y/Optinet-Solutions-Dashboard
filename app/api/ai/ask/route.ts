import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { askAi, isConfigured, type ChatMessage } from '@/lib/ai/ask';

export async function POST(req: NextRequest) {
  // Any logged-in user may ask (read-only).
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!isConfigured()) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  let body: { question?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const question = typeof body.question === 'string' ? body.question.trim() : '';
  if (!question) return NextResponse.json({ error: 'Please enter a question.' }, { status: 400 });

  const history: ChatMessage[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .filter((m): m is ChatMessage =>
          !!m && typeof m === 'object'
          && (('role' in m && ((m as ChatMessage).role === 'user' || (m as ChatMessage).role === 'assistant')))
          && 'content' in m && typeof (m as ChatMessage).content === 'string')
        .slice(-6)
    : [];

  const result = await askAi(question, history);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ answer: result.answer });
}
