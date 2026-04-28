// pages/taxi/taxi.js helper functions
getStatusText(status) {
  const statusMap = {
    'pending': '待分配',
    'assigned': '已分配',
    'completed': '已完成', 
    'cancelled': '已取消'
  };
  return statusMap[status] || status;
},

formatTime(timeStr) {
  if (!timeStr) return '';
  const date = new Date(timeStr);
  return `${date.getMonth() + 1}月${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}