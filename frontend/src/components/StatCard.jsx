const StatCard = ({ icon: Icon, label, value, tone = 'cyan', footer }) => {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-icon">{Icon ? <Icon size={22} /> : null}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {footer ? <small>{footer}</small> : null}
      </div>
    </article>
  );
};

export default StatCard;
