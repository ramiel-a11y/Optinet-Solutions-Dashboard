import type { TableConfig } from './types';

export const startupExpensesConfig: TableConfig = {
  name: 'startup_expenses',
  label: 'Startup Expenses',
  primaryKey: 'id',
  defaultSort: { field: 'purchaseDate', dir: 'desc' },
  searchable: ['item', 'category'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'purchaseDate', label: 'Purchased', type: 'date' },
    { field: 'item', label: 'Item', type: 'text', required: true },
    { field: 'category', label: 'Category', type: 'enum', options: ['Equipment', 'Furniture', 'Cash-out', 'Other'] },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'exRate', label: 'Rate', type: 'number', required: true, maxFractionDigits: 8 },
    { field: 'amountEur', label: 'EUR', type: 'number', readonly: true, hiddenInForm: true, maxFractionDigits: 0 },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
