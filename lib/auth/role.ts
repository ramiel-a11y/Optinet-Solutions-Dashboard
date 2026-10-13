import type { User } from '@supabase/supabase-js';

// A user is an admin when their Supabase metadata carries role === 'admin'. We check
// both app_metadata (set via the service role / dashboard, not user-editable) and
// user_metadata, so assigning the role in either place in the Supabase dashboard works.
// Pure (no server imports) so it stays unit-testable.
type RoleLike = {
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export function isAdminUser(user: User | RoleLike | null | undefined): boolean {
  if (!user) return false;
  const app = (user.app_metadata ?? {}) as Record<string, unknown>;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  return app.role === 'admin' || meta.role === 'admin';
}
