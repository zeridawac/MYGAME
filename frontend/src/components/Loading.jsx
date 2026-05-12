const Loading = ({ label = 'جاري التحميل...' }) => {
  return (
    <div className="loading-state">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
};

export default Loading;
