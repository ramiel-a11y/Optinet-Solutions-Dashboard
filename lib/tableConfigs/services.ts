import type { TableConfig } from './types';

export const servicesConfig: TableConfig = {
  name: 'services',
  label: 'Services',
  primaryKey: 'id',
  defaultSort: { field: 'sortOrder', dir: 'asc' },
  searchable: ['name', 'notes'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'name', label: 'Service', type: 'text', required: true },
    { field: 'sortOrder', label: 'Order', type: 'number' },
    { field: 'isActive', label: 'Active?', type: 'boolean' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
    { field: 'createdAt', label: 'Created', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
    { field: 'updatedAt', label: 'Updated', type: 'datetime', readonly: true, hiddenInList: true, hiddenInForm: true },
  ],
};
