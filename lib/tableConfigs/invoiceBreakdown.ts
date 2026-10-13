import type { TableConfig } from './types';

export const invoiceBreakdownConfig: TableConfig = {
  name: 'invoice_breakdown',
  label: 'Invoice Breakdown',
  primaryKey: 'id',
  defaultSort: { field: 'dateInvoice', dir: 'desc' },
  searchable: ['invoiceNumber', 'invoiceDetails', 'clientNameRaw', 'clientId'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'dateInvoice', label: 'Date', type: 'date' },
    { field: 'invoiceNumber', label: 'Invoice #', type: 'text' },
    { field: 'clientId', label: 'Client', type: 'fk', references: 'clients', display: 'clientName' },
    { field: 'clientNameRaw', label: 'Raw client', type: 'text', hiddenInList: true },
    { field: 'invoiceDetails', label: 'Details', type: 'textarea' },
    { field: 'amount', label: 'Amount', type: 'number', required: true },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
