import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'Sign in · Optinet Solutions Dashboard',
};

export default function LoginPage({
  searchParams,
}: { searchParams: Promise<{ next?: string; error?: string }> }) {
  return (
    <main className="min-h-screen grid place-items-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl leading-none">Optinet Solutions</h1>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mt-2 font-mono">
            Operations Dashboard
          </p>
        </div>
        <LoginForm searchParamsPromise={searchParams} />
        <p className="text-center text-xs text-muted-foreground mt-6 font-mono">
          Restricted access. Authorized accounts only.
        </p>
      </div>
    </main>
  );
}
