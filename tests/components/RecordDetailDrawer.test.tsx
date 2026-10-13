import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordDetailDrawer } from '@/components/record-detail/RecordDetailDrawer';
import { AdminProvider } from '@/components/auth/AdminContext';
import type { TableConfig } from '@/lib/tableConfigs/types';

const cfg: TableConfig = {
  name: 'foo',
  label: 'Foo',
  primaryKey: 'id',
  columns: [
    { field: 'name', label: 'Name', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number' },
  ],
};

const childCfg: TableConfig = {
  name: 'foo_lines',
  label: 'Foo lines',
  primaryKey: 'id',
  columns: [
    { field: 'description', label: 'Description', type: 'text' },
  ],
};

describe('RecordDetailDrawer', () => {
  it('renders fields of the open record', () => {
    render(
      <RecordDetailDrawer
        config={cfg}
        record={{ id: '1', name: 'Acme', amount: 99 }}
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  it('shows Edit and Delete buttons for admins', () => {
    render(
      <AdminProvider value={true}>
        <RecordDetailDrawer
          config={cfg}
          record={{ id: '1', name: 'Acme' }}
          open
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
        />
      </AdminProvider>
    );
    expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
  });

  it('hides Edit and Delete buttons for non-admins', () => {
    render(
      <RecordDetailDrawer
        config={cfg}
        record={{ id: '1', name: 'Acme' }}
        open
        onClose={vi.fn()}
        onSave={vi.fn()}
        onDelete={vi.fn()}
      />
    );
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('fires onDelete when Delete is clicked and confirmed (admin)', () => {
    const onDelete = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(
      <AdminProvider value={true}>
        <RecordDetailDrawer
          config={cfg}
          record={{ id: '1', name: 'Acme' }}
          open
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={onDelete}
        />
      </AdminProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('1');
  });

  describe('scrollToChildren (opt-in, create-only)', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ rows: [] }) })));
    });

    // vi.spyOn on Element.prototype.scrollIntoView returns the SAME mock
    // across tests once spied (it's already a mock after the first spyOn),
    // so its call history must be cleared explicitly or the next test
    // inherits the previous test's calls.
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('scrolls the Breakdown section into view when the caller opts in', () => {
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
      render(
        <RecordDetailDrawer
          config={cfg}
          record={{ id: '1', name: 'Acme', amount: 99 }}
          open
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          childConfig={childCfg}
          scrollToChildren
        />
      );
      expect(scrollSpy).toHaveBeenCalled();
    });

    it('does not scroll when the caller does not opt in — the grid-opened case', () => {
      const scrollSpy = vi.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
      render(
        <RecordDetailDrawer
          config={cfg}
          record={{ id: '1', name: 'Acme', amount: 99 }}
          open
          onClose={vi.fn()}
          onSave={vi.fn()}
          onDelete={vi.fn()}
          childConfig={childCfg}
        />
      );
      expect(scrollSpy).not.toHaveBeenCalled();
    });
  });
});
