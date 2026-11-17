import type { LucideIcon } from "lucide-react";

interface Props {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: "green" | "sand" | "blue";
}

export default function StatCard({ label, value, detail, icon: Icon, tone = "green" }: Props) {
  return (
    <article className="stat-card">
      <div className="stat-topline">
        <span>{label}</span>
        <span className={`stat-icon stat-icon-${tone}`}><Icon size={18}/></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </article>
  );
}
