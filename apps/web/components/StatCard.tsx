type StatCardProps = {
  label: string;
  value: number | string;
  description: string;
  icon: string;
};

export function StatCard({ label, value, description, icon }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className="stat-card-header">
        <span className="stat-label">{label}</span>
        <span className="stat-icon" aria-hidden="true">
          {icon}
        </span>
      </div>
      <strong className="stat-value">{value}</strong>
      <span className="stat-description">{description}</span>
    </article>
  );
}
