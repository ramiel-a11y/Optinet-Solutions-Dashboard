import type { TableConfig } from './types';

export const cashMovementsConfig: TableConfig = {
  name: 'cash_movements',
  label: 'Cash Movements',
  primaryKey: 'id',
  defaultSort: { field: 'date', dir: 'desc' },
  searchable: ['description', 'typeOfFunds', 'summary'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'date', label: 'Date', type: 'date', required: true },
    { field: 'description', label: 'Description', type: 'textarea' },
    { field: 'amount', label: 'Amount (EUR)', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'pesoAmount', label: 'PHP', type: 'number' },
    { field: 'typeOfFunds', label: 'Type', type: 'text' },
    { field: 'summary', label: 'Summary', type: 'text', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
