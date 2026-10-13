'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Msg = { role: 'user' | 'assistant'; content: string };

const SUGGESTIONS = [
  'Total expenses in June 2026?',
  'Top 5 clients by revenue',
  'How many unpaid invoices?',
];

export function AskAi() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    const history = messages.slice(-6);
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      });
      let reply: string;
      if (res.status === 503) {
        reply = "The AI assistant isn't switched on yet — an OpenAI API key needs to be added to the app's settings.";
      } else {
        const data = await res.json().catch(() => ({}));
        reply = res.ok ? data.answer : `Sorry — ${data.error ?? 'something went wrong.'}`;
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Sorry — the request failed. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[min(420px,calc(100vw-2rem))] h-[min(560px,calc(100vh-8rem))] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-indigo-500" />
              <span className="font-medium text-sm">AI Assistant</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close assistant">
              <X className="size-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground space-y-3">
                <p>Ask me about your revenue, expenses, invoices, clients, and more.</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => ask(s)}
                      className="text-left text-xs rounded-lg border px-3 py-2 hover:bg-muted transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap',
                    m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted'
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3.5 py-2 text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> Thinking…
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); ask(input); }}
            className="border-t p-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your data…"
              className="flex-1 h-9 rounded-lg border bg-transparent px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="grid place-items-center size-9 rounded-lg bg-foreground text-background disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'fixed bottom-6 right-6 z-50 inline-flex items-center gap-2 rounded-full pl-4 pr-5 py-3',
          'bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 text-white shadow-lg',
          'hover:shadow-xl hover:brightness-110 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'
        )}
        aria-label="Ask AI assistant"
      >
        {open ? <X className="size-5" /> : <Sparkles className="size-5" />}
        <span className="font-medium text-sm">AI Assistant</span>
      </button>
    </>
  );
}
