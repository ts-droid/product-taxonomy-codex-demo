import type { LucideIcon } from 'lucide-react';

type Props = {
  label: string;
  value: string | number;
  sublabel: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, sublabel, icon: Icon }: Props) {
  return (
    <div className="stat-card">
      <div>
        <div className="eyebrow">{label}</div>
        <div className="stat-value">{value}</div>
        <div className="muted">{sublabel}</div>
      </div>
      <div className="icon-shell">
        <Icon size={18} />
      </div>
    </div>
  );
}
