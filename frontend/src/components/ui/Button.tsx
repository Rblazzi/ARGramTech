import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'outline' | 'ghost';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-[var(--brand)] text-[var(--brand-foreground)] hover:opacity-90',
  outline: 'border border-[var(--brand)] text-[var(--brand)] hover:bg-[var(--brand)] hover:text-[var(--brand-foreground)]',
  ghost: 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)]',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

// Só empacota o padrão de classes já repetido em toda página (altura de
// toque consistente, estado disabled) — não é uma reescrita de estilo.
export function Button({ variant = 'primary', className = '', disabled, ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled}
      className={`min-h-10 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
