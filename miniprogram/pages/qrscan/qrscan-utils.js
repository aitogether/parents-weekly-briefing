// pages/qrscan/qrscan.js helper functions
formatCurrentTime() {
  const now = new Date();
  return `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
},

detectQRType(content) {
  // 简单的二维码内容类型检测
  if (content.startsWith('http://') || content.startsWith('https://')) {
    return '网址链接';
  } else if (content.match(/^\d{4}-\d{2}-\d{2}/)) {
    return '日期信息';
  } else if (content.length > 50) {
    return '文本信息';
  } else {
    return '普通内容';
  }
}