import { describe, it, expect } from 'vitest';
import { isAdminUser } from '@/lib/auth/role';

describe('isAdminUser', () => {
  it('is false for null / undefined', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });

  it('is true when app_metadata.role is admin', () => {
    expect(isAdminUser({ app_metadata: { role: 'admin' } })).toBe(true);
  });

  it('is true when user_metadata.role is admin', () => {
    expect(isAdminUser({ user_metadata: { role: 'admin' } })).toBe(true);
  });

  it('is false for a non-admin role or missing role', () => {
    expect(isAdminUser({ user_metadata: { role: 'guest' } })).toBe(false);
    expect(isAdminUser({ app_metadata: {}, user_metadata: {} })).toBe(false);
    expect(isAdminUser({})).toBe(false);
  });
});
