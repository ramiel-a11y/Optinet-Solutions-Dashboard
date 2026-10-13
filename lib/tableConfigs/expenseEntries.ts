import type { TableConfig } from './types';

export const expenseEntriesConfig: TableConfig = {
  name: 'expense_entries',
  label: 'Expenses',
  primaryKey: 'id',
  defaultSort: { field: 'dateInvoice', dir: 'desc' },
  searchable: ['invoiceNumber', 'invoiceDetails', 'supplierName', 'expenseClassification'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'dateInvoice', label: 'Date', type: 'date', required: true },
    { field: 'periodMonth', label: 'Month', type: 'month' },
    { field: 'invoiceNumber', label: 'Invoice #', type: 'text' },
    { field: 'supplierName', label: 'Supplier', type: 'text' },
    { field: 'invoiceDetails', label: 'Details', type: 'textarea' },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'exRate', label: 'Rate', type: 'number', required: true, maxFractionDigits: 8 },
    { field: 'amountEur', label: 'EUR', type: 'number', readonly: true, hiddenInForm: true, maxFractionDigits: 0 },
    { field: 'fundsPaid', label: 'Paid?', type: 'boolean' },
    { field: 'expenseClassification', label: 'Classification', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
