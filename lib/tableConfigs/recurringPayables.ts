import type { TableConfig } from './types';

export const recurringPayablesConfig: TableConfig = {
  name: 'recurring_payables',
  label: 'Recurring Payables',
  primaryKey: 'id',
  defaultSort: { field: 'category', dir: 'asc' },
  searchable: ['category', 'remarks'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'category', label: 'Category', type: 'text', required: true },
    { field: 'dueDate', label: 'Due', type: 'text' },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'remarks', label: 'Remarks', type: 'text' },
    { field: 'isActive', label: 'Active?', type: 'boolean' },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
