import type { TableConfig } from './types';

export const invoicesConfig: TableConfig = {
  name: 'invoices',
  label: 'Invoices',
  primaryKey: 'id',
  defaultSort: { field: 'invoiceDate', dir: 'desc' },
  searchable: ['invoiceNumber'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'invoiceNumber', label: 'Invoice #', type: 'text' },
    { field: 'invoiceDate', label: 'Date', type: 'date' },
    {
      field: 'type', label: 'Type', type: 'enum',
      options: ['brand_protection', 'brand_reputation', 'team_salary', 'rental_utilities', 'equipment'],
      required: true,
    },
    { field: 'totalAmount', label: 'Total', type: 'number' },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
