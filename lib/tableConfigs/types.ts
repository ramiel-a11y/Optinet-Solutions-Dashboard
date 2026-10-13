export type FieldType =
  | 'text'
  | 'textarea'
  | 'multiline'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'month'
  | 'enum'
  | 'currency'
  | 'url'
  | 'email'
  | 'phone'
  | 'fk'
  | 'password'
  | 'computed';

type BaseColumn = {
  field: string;
  label: string;
  required?: boolean;
  readonly?: boolean;
  hiddenInList?: boolean;
  hiddenInForm?: boolean;
  width?: number;
  maxFractionDigits?: number;   // for number/currency display; overrides the default rounding
};

type SimpleColumn = BaseColumn & {
  type: Exclude<FieldType, 'enum' | 'fk' | 'computed'>;
};

type EnumColumn = BaseColumn & {
  type: 'enum';
  options: readonly string[];
};

type FkColumn = BaseColumn & {
  type: 'fk';
  references: string;        // referenced table name
  display: string;           // column on the referenced table to show
};

type ComputedColumn = BaseColumn & {
  type: 'computed';
  compute: (row: Record<string, unknown>) => string | number | boolean | null;
};

export type ColumnConfig = SimpleColumn | EnumColumn | FkColumn | ComputedColumn;

export type SortDirection = 'asc' | 'desc';

export type TableConfig = {
  name: string;                 // DB table name
  label: string;                // human-friendly
  primaryKey: string;
  columns: ColumnConfig[];
  defaultSort?: { field: string; dir: SortDirection };
  searchable?: string[];        // fields included in free-text search
};
