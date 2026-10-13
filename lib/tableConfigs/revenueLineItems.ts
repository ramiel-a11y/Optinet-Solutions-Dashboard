import type { TableConfig } from './types';

// Per-service split of a revenue invoice. Rendered inside the revenue record
// drawer via LineItemsSection, so the parent FK stays hidden.
export const revenueLineItemsConfig: TableConfig = {
  name: 'revenue_line_items',
  label: 'Service line',
  primaryKey: 'id',
  defaultSort: { field: 'createdAt', dir: 'asc' },
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'revenueEntryId', label: 'Revenue entry', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'serviceId', label: 'Service', type: 'fk', references: 'services', display: 'name', required: true },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'autoClassified', label: 'Auto', type: 'boolean', hiddenInForm: true },
    { field: 'notes', label: 'Notes', type: 'text', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
