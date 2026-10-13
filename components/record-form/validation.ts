import { z, ZodTypeAny } from 'zod';
import type { ColumnConfig, TableConfig } from '@/lib/tableConfigs/types';

function columnSchema(col: ColumnConfig): ZodTypeAny {
  // Use the column label so messages read naturally for users.
  // Required fields say "<Label> is required" instead of Zod v4's default
  // "Invalid input: expected X, received undefined".
  const requiredMsg = `${col.label} is required`;
  let s: ZodTypeAny;
  switch (col.type) {
    case 'text':
    case 'textarea':
    case 'multiline':
    case 'password':
    case 'phone':
      s = col.required
        ? z.string({ error: requiredMsg }).min(1, { message: requiredMsg })
        : z.string();
      break;
    case 'number':
    case 'currency':
      s = col.required
        ? z.coerce.number({ error: requiredMsg })
        : z.coerce.number();
      break;
    case 'boolean':
      s = z.boolean();
      break;
    case 'date':
    case 'datetime':
      // Accept ISO string OR Date object; coerce to string for transport
      s = col.required
        ? z.union([z.string().min(1, { message: requiredMsg }), z.date()], { error: requiredMsg })
        : z.union([z.string().min(1), z.date()]);
      break;
    case 'month':
      // 'YYYY-MM' string from an <input type="month">
      s = col.required
        ? z.string({ error: requiredMsg }).min(1, { message: requiredMsg })
        : z.string();
      break;
    case 'email':
      s = col.required ? z.email({ error: requiredMsg }) : z.email();
      break;
    case 'url':
      s = col.required ? z.url({ error: requiredMsg }) : z.url();
      break;
    case 'enum':
      s = col.required
        ? z.enum(col.options as readonly [string, ...string[]], { error: requiredMsg })
        : z.enum(col.options as readonly [string, ...string[]]);
      break;
    case 'fk':
      s = col.required
        ? z.string({ error: requiredMsg }).uuid()
        : z.string().uuid();
      break;
    case 'computed':
      // Computed values are derived, not user-input
      s = z.any();
      break;
  }
  if (!col.required) s = s.optional().nullable();
  return s;
}

export function buildZodSchema(config: TableConfig) {
  const shape: Record<string, ZodTypeAny> = {};
  for (const col of config.columns) {
    if (col.hiddenInForm || col.readonly || col.type === 'computed') continue;
    shape[col.field] = columnSchema(col);
  }
  return z.object(shape);
}
