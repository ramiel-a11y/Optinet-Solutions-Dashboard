'use client';
import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Controller, Control, FieldError } from 'react-hook-form';

export function FkField(props: {
  name: string;
  label: string;
  required?: boolean;
  references: string;
  display: string;
  control: Control<Record<string, unknown>>;
  error?: FieldError;
}) {
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);

  useEffect(() => {
    fetch(`/api/tables/${props.references}?limit=1000`)
      .then((r) => r.json())
      .then((d) => {
        const rows = d.rows as Record<string, unknown>[];
        setOptions(rows.map((r) => ({
          id: String(r.id),
          label: String(r[props.display] ?? r.id),
        })));
      });
  }, [props.references, props.display]);

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
              {options.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {props.error && <p className="text-sm text-red-500">{props.error.message}</p>}
    </div>
  );
}
