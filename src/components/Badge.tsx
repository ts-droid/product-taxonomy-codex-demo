import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
  tone?: 'default' | 'success' | 'warning' | 'accent';
};

export function Badge({ children, tone = 'default' }: Props) {
  const cls = {
    default: 'badge badge-default',
    success: 'badge badge-success',
    warning: 'badge badge-warning',
    accent: 'badge badge-accent',
  }[tone];
  return <span className={cls}>{children}</span>;
}
