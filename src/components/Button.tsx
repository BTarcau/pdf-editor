import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const base =
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ' +
  'disabled:cursor-not-allowed disabled:opacity-40'

const variants: Record<Variant, string> = {
  primary: 'bg-blue-600 px-3.5 py-2 text-white hover:bg-blue-700',
  secondary:
    'border border-neutral-300 bg-white px-3.5 py-2 text-neutral-900 hover:bg-neutral-100 ' +
    'dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700',
  ghost:
    'p-2 text-neutral-700 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
  danger: 'bg-red-600 px-3 py-1.5 text-white hover:bg-red-700',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...rest }: Props) {
  return <button type={type} className={`${base} ${variants[variant]} ${className}`} {...rest} />
}
