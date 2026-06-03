import React from 'react';
import { Eye, EyeOff, type LucideIcon } from 'lucide-react';

interface SensitiveInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  revealed: boolean;
  onToggleReveal: () => void;
  hiddenType?: 'password' | 'text';
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  disabled?: boolean;
  leftIcon?: LucideIcon;
  inputClassName?: string;
  containerClassName?: string;
  buttonClassName?: string;
  ariaLabelReveal?: string;
  ariaLabelHide?: string;
}

export default function SensitiveInputField({
  value,
  onChange,
  revealed,
  onToggleReveal,
  hiddenType = 'password',
  placeholder,
  required,
  minLength,
  disabled,
  leftIcon: LeftIcon,
  inputClassName = '',
  containerClassName = '',
  buttonClassName = '',
  ariaLabelReveal = 'Revelar conteudo',
  ariaLabelHide = 'Ocultar conteudo',
}: SensitiveInputFieldProps) {
  const resolvedInputClassName = [
    'w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 focus:outline-none focus:border-[#FF5500]',
    LeftIcon ? 'pl-9' : 'pl-3',
    'pr-12',
    inputClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const resolvedButtonClassName = [
    'flex h-6 w-6 items-center justify-center rounded-md border-0 bg-transparent p-0 text-zinc-400 hover:text-zinc-700 focus:outline-none disabled:opacity-50',
    buttonClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={['relative', containerClassName].filter(Boolean).join(' ')}>
      {LeftIcon ? <LeftIcon className="absolute left-3 top-3.5 h-4 w-4 text-zinc-400" /> : null}
      <input
        type={revealed ? 'text' : hiddenType}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={resolvedInputClassName}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className="absolute inset-y-0 right-0 z-10 flex items-center pr-3">
        <button
          type="button"
          onClick={onToggleReveal}
          className={resolvedButtonClassName}
          aria-label={revealed ? ariaLabelHide : ariaLabelReveal}
          disabled={disabled}
        >
          {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
