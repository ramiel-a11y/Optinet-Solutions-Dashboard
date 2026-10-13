import type { TableConfig, ColumnConfig } from './types';

// Per-invoice-type breakdown configs for the shared `invoice_line_items` table.
// Each invoice type surfaces the same underlying columns under type-appropriate
// labels (the columns not listed for a type stay hidden but remain in the DB).

const HIDDEN_COLUMNS: ColumnConfig[] = [
  { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
  { field: 'invoiceId', label: 'Invoice', type: 'text', hiddenInList: true, hiddenInForm: true },
  { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
];

function lineItemConfig(columns: ColumnConfig[]): TableConfig {
  return {
    name: 'invoice_line_items',
    label: 'Line item',
    primaryKey: 'id',
    defaultSort: { field: 'createdAt', dir: 'asc' },
    columns: [...HIDDEN_COLUMNS, ...columns],
  };
}

// Keyed by invoice type enum value.
export const lineItemConfigs: Record<string, TableConfig> = {
  team_salary: lineItemConfig([
    { field: 'description', label: 'Employee', type: 'text', required: true },
    { field: 'startingDate', label: 'Starting Date', type: 'date' },
    { field: 'detail', label: 'Title / Role', type: 'text' },
    { field: 'quantity', label: 'Hours', type: 'number' },
    { field: 'amount', label: 'Amount', type: 'number' },
    { field: 'totalAmount', label: 'Total', type: 'number' },
  ]),
  brand_protection: lineItemConfig([
    { field: 'description', label: 'Description', type: 'text' },
    { field: 'detail', label: 'Sites', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number' },
    { field: 'totalAmount', label: 'Total', type: 'number' },
  ]),
  brand_reputation: lineItemConfig([
    { field: 'description', label: 'Description', type: 'text' },
    { field: 'detail', label: 'Detail', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number' },
    { field: 'totalAmount', label: 'Total', type: 'number' },
  ]),
  rental_utilities: lineItemConfig([
    { field: 'description', label: 'Description', type: 'text' },
    { field: 'detail', label: 'Due Date', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number' },
    { field: 'totalAmount', label: 'Total', type: 'number' },
  ]),
  equipment: lineItemConfig([
    { field: 'description', label: 'Product', type: 'text' },
    { field: 'detail', label: 'Unit Price', type: 'text' },
    { field: 'quantity', label: 'Qty', type: 'number' },
    { field: 'amount', label: 'Amount (PHP)', type: 'number' },
    { field: 'totalAmount', label: 'Total (EUR)', type: 'number' },
  ]),
};

// Team Salary config kept as a named export (used directly by its page and the
// table-config registry).
export const invoiceLineItemsConfig = lineItemConfigs.team_salary;
