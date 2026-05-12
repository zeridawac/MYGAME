import { Sparkles } from 'lucide-react';

const EmptyState = ({ title = 'لا توجد بيانات بعد', text = 'ستظهر البيانات هنا عند توفرها.' }) => {
  return (
    <div className="empty-state">
      <Sparkles size={24} />
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
};

export default EmptyState;
