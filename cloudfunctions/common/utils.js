// 通用工具函数
const moment = require('moment');

module.exports = {
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },
  
  toRad(deg) {
    return deg * Math.PI / 180;
  },
  
  getMondayOfWeek(weekNumber, year) {
    const simple = new Date(year, 0, 1 + (weekNumber - 1) * 7);
    const dow = simple.getDay();
    const diff = simple.getDate() - dow + (dow === 0 ? -6 : 1);
    return new Date(simple.setDate(diff));
  },
  
  formatDate(date) {
    return moment(date).format('YYYY-MM-DD');
  }
};
