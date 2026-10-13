import { describe, it, expect, vi } from 'vitest';
import { DEMO_EMAIL, ensureDemoUser, type AdminApi } from '@/scripts/demo/demoUser';

function fakeAdmin(users: { id: string; email: string }[]): AdminApi {
  return {
    listUsers: vi.fn(async () => ({ data: { users }, error: null })),
    createUser: vi.fn(async () => ({ data: { user: { id: 'new' } }, error: null })),
    updateUserById: vi.fn(async () => ({ data: { user: { id: 'u1' } }, error: null })),
  };
}

describe('ensureDemoUser', () => {
  it('creates the demo admin, email pre-confirmed, when it does not exist', async () => {
    const admin = fakeAdmin([{ id: 'x', email: 'someone@example.com' }]);
    expect(await ensureDemoUser(admin, 'pw-123456')).toBe('created');
    expect(admin.createUser).toHaveBeenCalledWith({
      email: DEMO_EMAIL, password: 'pw-123456', email_confirm: true,
      app_metadata: { role: 'admin' }, user_metadata: { name: 'Demo' },
    });
    expect(admin.updateUserById).not.toHaveBeenCalled();
  });

  it('resets an existing demo user instead of creating a second one', async () => {
    const admin = fakeAdmin([{ id: 'u1', email: 'Demo@OptinetSolutions.com' }]);
    expect(await ensureDemoUser(admin, 'pw-123456')).toBe('updated');
    expect(admin.updateUserById).toHaveBeenCalledWith('u1', expect.objectContaining({
      password: 'pw-123456', app_metadata: { role: 'admin' },
    }));
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it('refuses to run without a password', async () => {
    await expect(ensureDemoUser(fakeAdmin([]), undefined)).rejects.toThrow(/DEMO_PASSWORD/);
  });

  it('surfaces an admin API error rather than reporting success', async () => {
    const admin = fakeAdmin([]);
    admin.createUser = vi.fn(async () => ({ data: { user: null }, error: { message: 'boom' } }));
    await expect(ensureDemoUser(admin, 'pw-123456')).rejects.toThrow(/boom/);
  });
});
