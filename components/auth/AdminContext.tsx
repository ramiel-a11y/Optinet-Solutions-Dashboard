'use client';
import { createContext, useContext } from 'react';

// Whether the current user is an admin. Set once at the dashboard layout (resolved
// server-side) and read by client components to show/hide write controls.
const AdminContext = createContext(false);

export function AdminProvider({ value, children }: { value: boolean; children: React.ReactNode }) {
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useIsAdmin(): boolean {
  return useContext(AdminContext);
}
