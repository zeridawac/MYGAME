export const formatNumber = (value = 0) => {
  return Math.round(Number(value || 0)).toLocaleString('ar-MA');
};

export const formatMoney = (value = 0) => {
  return `$${Number(value || 0).toFixed(2)}`;
};

export const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ar-MA');
};

export const statusLabel = (status) => {
  const labels = {
    pending: 'قيد المراجعة',
    approved: 'مقبول',
    rejected: 'مرفوض'
  };

  return labels[status] || status;
};
