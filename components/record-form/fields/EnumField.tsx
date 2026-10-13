'use client';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Controller, Control, FieldError } from 'react-hook-form';

export function EnumField(props: {
  name: string;
  label: string;
  required?: boolean;
  options: readonly string[];
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
          <Select value={(field.value as string) ?? ''} onValueChange={field.onChange}>
            <SelectTrigger id={props.name} aria-label={props.label}>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {props.options.map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {props.error && <p className="text-sm text-red-500">{props.error.message}</p>}
    </div>
  );
}
