import { createClient } from '@/lib/supabase/server';
import { isAdminUser } from './role';

// Server-side admin check for API routes / server actions. Returns true only when the
// authenticated user carries role === 'admin'. Use to gate writes so hiding the UI
// controls isn't the only barrier.
export async function isAdminRequest(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminUser(user);
}
