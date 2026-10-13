import type { TableConfig } from './types';

export const pettyCashTransactionsConfig: TableConfig = {
  name: 'petty_cash_transactions',
  label: 'Petty Cash',
  primaryKey: 'id',
  defaultSort: { field: 'date', dir: 'desc' },
  searchable: ['details'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'date', label: 'Date', type: 'date', required: true },
    // Derived from `date` and injected by the page — NOT a database column.
    // readonly + hiddenInForm keep it out of every form payload; RecordForm
    // skips exactly those, and updateRecord would throw on an unknown key.
    { field: 'month', label: 'Month', type: 'text', readonly: true, hiddenInForm: true },
    // Hidden from the grid, but kept on the record: it is
    // what splits top-ups from expenses for the summary cards.
    { field: 'type', label: 'Type', type: 'enum', options: ['expense', 'topup'], required: true, hiddenInList: true },
    { field: 'details', label: 'Details', type: 'textarea' },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'exRate', label: 'Rate', type: 'number', required: true, maxFractionDigits: 8 },
    { field: 'amountEur', label: 'EUR', type: 'number', readonly: true, hiddenInForm: true, maxFractionDigits: 0 },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
