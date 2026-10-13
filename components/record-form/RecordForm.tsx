'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import {
  TextField, NumberField, EnumField, BooleanField, DateField, MonthField, TextareaField, FkField,
} from './fields';
import { buildZodSchema } from './validation';
import type { TableConfig } from '@/lib/tableConfigs/types';

type Props = {
  config: TableConfig;
  initialValues?: Record<string, unknown>;
  onSubmit: (values: Record<string, unknown>) => void | Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
};

export function RecordForm({ config, initialValues, onSubmit, onCancel, submitLabel = 'Save' }: Props) {
  const schema = buildZodSchema(config);
  const {
    control, handleSubmit, formState: { errors, isSubmitting },
  } = useForm<Record<string, unknown>>({
    resolver: zodResolver(schema as never),
    defaultValues: initialValues ?? {},
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4">
      {config.columns.map((col) => {
        if (col.hiddenInForm || col.readonly || col.type === 'computed') return null;
        const err = errors[col.field] as { message?: string } | undefined;
        const errObj = err ? { type: 'manual', message: err.message ?? 'Invalid' } as never : undefined;
        switch (col.type) {
          case 'text':
          case 'phone':
            return <TextField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} />;
          case 'email':
            return <TextField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} type="email" />;
          case 'url':
            return <TextField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} type="url" />;
          case 'password':
            return <TextField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} type="password" />;
          case 'textarea':
          case 'multiline':
            return <TextareaField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} />;
          case 'number':
          case 'currency':
            return <NumberField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} />;
          case 'boolean':
            return <BooleanField key={col.field} name={col.field} label={col.label} control={control} />;
          case 'date':
          case 'datetime':
            return <DateField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} />;
          case 'month':
            return <MonthField key={col.field} name={col.field} label={col.label} required={col.required} control={control} error={errObj} />;
          case 'enum':
            return <EnumField key={col.field} name={col.field} label={col.label} required={col.required} options={col.options} control={control} error={errObj} />;
          case 'fk':
            return <FkField key={col.field} name={col.field} label={col.label} required={col.required} references={col.references} display={col.display} control={control} error={errObj} />;
        }
      })}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{submitLabel}</Button>
      </div>
    </form>
  );
}
