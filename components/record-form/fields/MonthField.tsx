'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Controller, Control, FieldError } from 'react-hook-form';

// Allocation-month picker. Stores/returns a 'YYYY-MM' string via <input type="month">.
export function MonthField(props: {
  name: string;
  label: string;
  required?: boolean;
  control: Control<Record<string, unknown>>;
  error?: FieldError;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={props.name}>{props.label}{props.required && ' *'}</Label>
      <Controller
        name={props.name}
        control={props.control}
        render={({ field }) => (
          <Input
            id={props.name}
            type="month"
            value={((field.value as string) ?? '').slice(0, 7)}
            onChange={field.onChange}
            onBlur={field.onBlur}
          />
        )}
      />
      {props.error && <p className="text-sm text-red-500">{props.error.message}</p>}
    </div>
  );
}
