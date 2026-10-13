'use client';
import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/browser';
import { Loader2 } from 'lucide-react';

type Props = {
  searchParamsPromise: Promise<{ next?: string; error?: string }>;
};

export function LoginForm({ searchParamsPromise }: Props) {
  const params = use(searchParamsPromise);
  const router = useRouter();
  const sp = useSearchParams();
  const next = params.next ?? sp.get('next') ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Surface a middleware-supplied error param on first render (decoded once).
  const [error, setError] = useState<string | null>(
    params.error ? decodeURIComponent(params.error) : null
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border bg-card p-6 space-y-4 shadow-sm"
    >
      <div className="grid gap-2">
        <Label htmlFor="email" className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@optinetsolutions.com"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password" className="text-xs uppercase tracking-[0.14em] text-muted-foreground font-mono">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 dark:bg-rose-900/20 rounded px-3 py-2">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading && <Loader2 className="size-4 mr-2 animate-spin" />}
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  );
}
