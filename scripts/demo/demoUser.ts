// Creates or resets the shared demo login through the Supabase admin API. The admin
// client is passed in, so the create-or-update rules are tested without a network.
export const DEMO_EMAIL = 'demo@optinetsolutions.com';

type AdminUser = { id: string; email?: string | null };
type AdminResult<T> = { data: T; error: { message: string } | null };
type UserAttrs = {
  email?: string;
  password: string;
  email_confirm: boolean;
  app_metadata: { role: 'admin' };
  user_metadata: { name: string };
};

export type AdminApi = {
  listUsers(params: { page: number; perPage: number }): Promise<AdminResult<{ users: AdminUser[] }>>;
  createUser(attrs: UserAttrs): Promise<AdminResult<{ user: AdminUser | null }>>;
  updateUserById(id: string, attrs: UserAttrs): Promise<AdminResult<{ user: AdminUser | null }>>;
};

const PAGE = 200;

export async function ensureDemoUser(admin: AdminApi, password: string | undefined): Promise<'created' | 'updated'> {
  if (!password) throw new Error('DEMO_PASSWORD is not set in .env; the demo login needs one.');
  const attrs: UserAttrs = {
    password,
    email_confirm: true,
    app_metadata: { role: 'admin' },
    user_metadata: { name: 'Demo' },
  };
  for (let page = 1; ; page++) {
    const { data, error } = await admin.listUsers({ page, perPage: PAGE });
    if (error) throw new Error(`Listing users failed: ${error.message}`);
    const found = data.users.find((u) => u.email?.toLowerCase() === DEMO_EMAIL);
    if (found) {
      const res = await admin.updateUserById(found.id, attrs);
      if (res.error) throw new Error(`Updating the demo user failed: ${res.error.message}`);
      return 'updated';
    }
    if (data.users.length < PAGE) break;
  }
  const res = await admin.createUser({ email: DEMO_EMAIL, ...attrs });
  if (res.error) throw new Error(`Creating the demo user failed: ${res.error.message}`);
  return 'created';
}
