'use client';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Controller, Control, FieldError } from 'react-hook-form';

export function TextareaField(props: {
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
          <Textarea
            id={props.name}
            value={(field.value as string) ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            rows={3}
          />
        )}
      />
      {props.error && <p className="text-sm text-red-500">{props.error.message}</p>}
    </div>
  );
}
