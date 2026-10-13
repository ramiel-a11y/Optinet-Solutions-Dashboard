import type { TableConfig } from './types';

export const clientsConfig: TableConfig = {
  name: 'clients',
  label: 'Clients',
  primaryKey: 'id',
  defaultSort: { field: 'clientName', dir: 'asc' },
  searchable: ['clientName', 'companyName', 'country', 'email'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'clientName', label: 'Client', type: 'text', required: true },
    { field: 'companyName', label: 'Company', type: 'text' },
    { field: 'country', label: 'Country', type: 'text' },
    { field: 'typeOfCompany', label: 'Type', type: 'text' },
    { field: 'typeOfServices', label: 'Services', type: 'text', hiddenInList: true },
    { field: 'contract', label: 'Contract', type: 'text', hiddenInList: true },
    { field: 'website', label: 'Website', type: 'url' },
    { field: 'contacts', label: 'Contacts', type: 'text', hiddenInList: true },
    { field: 'email', label: 'Email', type: 'email' },
    { field: 'login', label: 'Login', type: 'text', hiddenInList: true },
    { field: 'password', label: 'Password', type: 'password', hiddenInList: true },
    { field: 'costs', label: 'Costs', type: 'text', hiddenInList: true },
    { field: 'dateStarted', label: 'Started', type: 'date' },
    { field: 'paid', label: 'Paid', type: 'text', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const clientServicesConfig: TableConfig = {
  name: 'client_services',
  label: 'Client Services',
  primaryKey: 'id',
  defaultSort: { field: 'dateStarted', dir: 'desc' },
  searchable: ['clientNameRaw', 'serviceName', 'clientId'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'clientId', label: 'Client', type: 'fk', references: 'clients', display: 'clientName' },
    { field: 'clientNameRaw', label: 'Raw client', type: 'text', hiddenInList: true },
    { field: 'serviceName', label: 'Service', type: 'text' },
    { field: 'costs', label: 'Costs', type: 'text' },
    { field: 'dateStarted', label: 'Started', type: 'date' },
    { field: 'paid', label: 'Paid', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const freeLinkPartnersConfig: TableConfig = {
  name: 'free_link_partners',
  label: 'Link Partners',
  primaryKey: 'id',
  defaultSort: { field: 'partnerUrl', dir: 'asc' },
  searchable: ['partnerUrl', 'target'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'partnerUrl', label: 'Partner site', type: 'url', required: true },
    { field: 'target', label: 'Target', type: 'text' },
    { field: 'linksApproved', label: 'Approved link', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const billingOrdersConfig: TableConfig = {
  name: 'billing_orders',
  label: 'Billing',
  primaryKey: 'id',
  defaultSort: { field: 'orderDate', dir: 'desc' },
  searchable: ['clientNameRaw', 'orderDetails', 'clientId'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'clientId', label: 'Client', type: 'fk', references: 'clients', display: 'clientName' },
    { field: 'clientNameRaw', label: 'Raw client', type: 'text', hiddenInList: true },
    { field: 'orderDate', label: 'Ordered', type: 'date' },
    { field: 'orderDetails', label: 'Details', type: 'textarea' },
    { field: 'amount', label: 'Amount', type: 'number' },
    { field: 'currency', label: 'Currency', type: 'enum', options: ['EUR', 'USD', 'PHP'], required: true },
    { field: 'orderCompleted', label: 'Done?', type: 'boolean' },
    { field: 'invoiceIssued', label: 'Invoiced?', type: 'boolean' },
    { field: 'paymentReceived', label: 'Paid?', type: 'boolean' },
    { field: 'moneyDeposited', label: 'Deposited', type: 'text', hiddenInList: true },
    { field: 'dueDate', label: 'Due', type: 'date', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const employeesConfig: TableConfig = {
  name: 'employees',
  label: 'Employees',
  primaryKey: 'id',
  defaultSort: { field: 'dateStarted', dir: 'desc' },
  searchable: ['name', 'position', 'expertise', 'companyEmail'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'name', label: 'Name', type: 'text', required: true },
    { field: 'position', label: 'Position', type: 'text' },
    { field: 'expertise', label: 'Expertise', type: 'text' },
    { field: 'grossSalaryMonthlyEur', label: 'Salary (EUR/mo)', type: 'number' },
    { field: 'grossSalaryYearlyEur', label: 'Salary (EUR/yr)', type: 'number', hiddenInList: true },
    { field: 'grossSalaryMonthlyPhp', label: 'Salary (PHP/mo)', type: 'number', hiddenInList: true },
    { field: 'dateStarted', label: 'Started', type: 'date' },
    { field: 'endDate', label: 'Ended', type: 'date', hiddenInList: true },
    { field: 'dateOfBirth', label: 'Birthday', type: 'date', hiddenInList: true },
    { field: 'skype', label: 'Skype', type: 'text', hiddenInList: true },
    { field: 'privateEmail', label: 'Personal email', type: 'email', hiddenInList: true },
    { field: 'companyEmail', label: 'Company email', type: 'email' },
    { field: 'phoneNumber', label: 'Phone', type: 'phone', hiddenInList: true },
    { field: 'next13thDate', label: 'Next 13th', type: 'date', hiddenInList: true },
    { field: 'nextBonusDate', label: 'Next bonus', type: 'date', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const bonusPaymentsConfig: TableConfig = {
  name: 'bonus_payments',
  label: 'Bonuses',
  primaryKey: 'id',
  defaultSort: { field: 'dateStarted', dir: 'desc' },
  searchable: ['employeeName', 'employeeId'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'employeeId', label: 'Employee', type: 'fk', references: 'employees', display: 'name' },
    { field: 'employeeName', label: 'Raw name', type: 'text', hiddenInList: true },
    { field: 'type', label: 'Type', type: 'enum', options: ['13th_month', 'bonus_50pct'], required: true },
    { field: 'salary', label: 'Salary', type: 'number' },
    { field: 'percent', label: '%', type: 'number' },
    { field: 'bonusAmount', label: 'Bonus', type: 'number' },
    { field: 'dateStarted', label: 'Date', type: 'date' },
    { field: 'computation', label: 'Computation', type: 'number', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const hrAgenciesConfig: TableConfig = {
  name: 'hr_agencies',
  label: 'HR Agencies',
  primaryKey: 'id',
  defaultSort: { field: 'agencyUrl', dir: 'asc' },
  searchable: ['agencyUrl', 'remarks'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'agencyUrl', label: 'Agency URL', type: 'url', required: true },
    { field: 'remarks', label: 'Remarks', type: 'text' },
    { field: 'comments', label: 'Comments', type: 'text' },
    { field: 'socMedAccounts', label: 'Social', type: 'text', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const equipmentItemsConfig: TableConfig = {
  name: 'equipment_items',
  label: 'Equipment',
  primaryKey: 'id',
  defaultSort: { field: 'dateAcquired', dir: 'desc' },
  searchable: ['item'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'item', label: 'Item', type: 'text', required: true },
    { field: 'unitPrice', label: 'Unit price', type: 'number' },
    { field: 'quantity', label: 'Qty', type: 'number' },
    { field: 'amountPhp', label: 'PHP', type: 'number' },
    { field: 'amountEur', label: 'EUR', type: 'number' },
    { field: 'dateAcquired', label: 'Acquired', type: 'date' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const domainsConfig: TableConfig = {
  name: 'domains',
  label: 'Domains',
  primaryKey: 'id',
  defaultSort: { field: 'domain', dir: 'asc' },
  searchable: ['domain', 'mainSite', 'hosting', 'owner', 'registrant'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'domain', label: 'Domain', type: 'text', required: true },
    { field: 'mainSite', label: 'Main site', type: 'text' },
    { field: 'status', label: 'Status', type: 'text' },
    { field: 'datePurchased', label: 'Purchased', type: 'date' },
    { field: 'expiresAt', label: 'Expires', type: 'date' },
    { field: 'price', label: 'Price', type: 'number' },
    { field: 'currency', label: 'Cur', type: 'enum', options: ['EUR', 'USD', 'PHP'] },
    { field: 'hosting', label: 'Hosting', type: 'text' },
    { field: 'owner', label: 'Owner', type: 'text', hiddenInList: true },
    { field: 'registrant', label: 'Registrant', type: 'text', hiddenInList: true },
    { field: 'registrantEmail', label: 'Reg. email', type: 'email', hiddenInList: true },
    { field: 'hostingEmail', label: 'Hosting email', type: 'email', hiddenInList: true },
    { field: 'domainSupplier', label: 'Supplier', type: 'text', hiddenInList: true },
    { field: 'tags', label: 'Tags', type: 'text', hiddenInList: true },
    { field: 'campaigns', label: 'Campaigns', type: 'text', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const domainChecksConfig: TableConfig = {
  name: 'domain_checks',
  label: 'Domain Checks',
  primaryKey: 'id',
  defaultSort: { field: 'dateChecked', dir: 'desc' },
  searchable: ['rankWebsite', 'location'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'rankWebsite', label: 'Site', type: 'text', required: true },
    { field: 'location', label: 'Location', type: 'text' },
    { field: 'dateChecked', label: 'Checked', type: 'date' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const officeFurnitureConfig: TableConfig = {
  name: 'office_furniture',
  label: 'Office Furniture',
  primaryKey: 'id',
  defaultSort: { field: 'datePurchased', dir: 'desc' },
  searchable: ['item'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'item', label: 'Item', type: 'text', required: true },
    { field: 'quantity', label: 'Qty', type: 'number' },
    { field: 'amount', label: 'Unit amount', type: 'number' },
    { field: 'totalAmount', label: 'Total', type: 'number' },
    { field: 'currency', label: 'Cur', type: 'enum', options: ['EUR', 'USD', 'PHP'] },
    { field: 'datePurchased', label: 'Purchased', type: 'date' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const officeLeaseConfig: TableConfig = {
  name: 'office_lease',
  label: 'Office Lease',
  primaryKey: 'id',
  defaultSort: { field: 'label', dir: 'asc' },
  searchable: ['label', 'remarks'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'label', label: 'Item', type: 'text', required: true },
    { field: 'contractAmountPhp', label: 'PHP', type: 'number' },
    { field: 'contractAmountEur', label: 'EUR', type: 'number' },
    { field: 'startDate', label: 'Start', type: 'date' },
    { field: 'endDate', label: 'End', type: 'date', hiddenInList: true },
    { field: 'paidStatus', label: 'Paid', type: 'text' },
    { field: 'remarks', label: 'Remarks', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const credentialsConfig: TableConfig = {
  name: 'credentials',
  label: 'Credentials',
  primaryKey: 'id',
  defaultSort: { field: 'owner', dir: 'asc' },
  searchable: ['owner', 'service', 'username'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'owner', label: 'Owner', type: 'enum', options: ['MARCO', 'SOFIA', 'DANIEL', 'Northgate Hub', 'Partner Sites'] },
    { field: 'service', label: 'Service', type: 'text' },
    { field: 'url', label: 'URL', type: 'url' },
    { field: 'username', label: 'Username', type: 'text' },
    { field: 'password', label: 'Password', type: 'password' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const softwareLicensesConfig: TableConfig = {
  name: 'software_licenses',
  label: 'Software Licenses',
  primaryKey: 'id',
  defaultSort: { field: 'datePurchased', dir: 'desc' },
  searchable: ['softwareName', 'plan'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'softwareName', label: 'Software', type: 'text', required: true },
    { field: 'url', label: 'URL', type: 'url', hiddenInList: true },
    { field: 'plan', label: 'Plan', type: 'text' },
    { field: 'datePurchased', label: 'Purchased', type: 'date' },
    { field: 'priceUsd', label: 'Price (USD)', type: 'number' },
    { field: 'paidAmountUsd', label: 'Paid (USD)', type: 'number' },
    { field: 'username', label: 'Username', type: 'text' },
    { field: 'password', label: 'Password', type: 'password' },
    { field: 'apiToken', label: 'API token', type: 'text', hiddenInList: true },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const landingPagesConfig: TableConfig = {
  name: 'landing_pages',
  label: 'Landing Pages',
  primaryKey: 'id',
  defaultSort: { field: 'url', dir: 'asc' },
  searchable: ['url', 'remarks'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'url', label: 'URL', type: 'url', required: true },
    { field: 'actualCostUsd', label: 'Actual (USD)', type: 'number' },
    { field: 'vendorCostUsd', label: 'Vendor cost (USD)', type: 'number' },
    { field: 'remarks', label: 'Remarks', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};

export const businessPlanItemsConfig: TableConfig = {
  name: 'business_plan_items',
  label: 'Business Plan',
  primaryKey: 'id',
  defaultSort: { field: 'category', dir: 'asc' },
  searchable: ['item', 'category', 'frequency'],
  columns: [
    { field: 'id', label: 'ID', type: 'text', hiddenInList: true, hiddenInForm: true },
    { field: 'category', label: 'Category', type: 'text' },
    { field: 'item', label: 'Item', type: 'text', required: true },
    { field: 'estimated', label: 'Estimated', type: 'number' },
    { field: 'total', label: 'Total', type: 'number' },
    { field: 'frequency', label: 'Frequency', type: 'text' },
    { field: 'notes', label: 'Notes', type: 'multiline', hiddenInList: true },
  ],
};
