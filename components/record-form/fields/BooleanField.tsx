'use client';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Controller, Control } from 'react-hook-form';

export function BooleanField(props: {
  name: string;
  label: string;
  control: Control<Record<string, unknown>>;
}) {
  return (
    <div className="flex items-center gap-2">
      <Controller
        name={props.name}
        control={props.control}
        render={({ field }) => (
          <Checkbox
            id={props.name}
            checked={!!field.value}
            onCheckedChange={(v) => field.onChange(v === true)}
          />
        )}
      />
      <Label htmlFor={props.name}>{props.label}</Label>
    </div>
  );
}
