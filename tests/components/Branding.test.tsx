import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'font-geist-sans' }),
  Geist_Mono: () => ({ variable: 'font-geist-mono' }),
  Instrument_Serif: () => ({ variable: 'font-display' }),
}));
vi.mock('@/app/login/LoginForm', () => ({ LoginForm: () => null }));

import { Sidebar } from '@/components/sidebar/Sidebar';
import LoginPage, { metadata as loginMetadata } from '@/app/login/page';
import { metadata as rootMetadata } from '@/app/layout';

describe('Optinet Solutions branding', () => {
  it('shows the Optinet Solutions wordmark over the Dashboard label in the sidebar', () => {
    render(<Sidebar />);
    expect(screen.getByText('Optinet Solutions')).toBeInTheDocument();
    expect(screen.getByText('Dashboard', { selector: 'p' })).toBeInTheDocument();
  });

  it('shows the wordmark over Operations Dashboard on the login page', () => {
    render(LoginPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole('heading', { level: 1, name: 'Optinet Solutions' })).toBeInTheDocument();
    expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
  });

  it('titles the browser tab Optinet Solutions Dashboard', () => {
    expect(rootMetadata.title).toBe('Optinet Solutions Dashboard');
    expect(loginMetadata.title).toBe('Sign in · Optinet Solutions Dashboard');
  });
});
