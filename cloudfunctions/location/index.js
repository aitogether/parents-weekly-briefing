const db = require('../common/db');
const { calculateDistance } = require('../common/utils');
const logger = require('../common/logger');

exports.main = async (event) => {
  const { action, parentId, latitude, longitude } = event;
  
  if (action === 'upload') {
    return await uploadLocation(parentId, latitude, longitude);
  }
  if (action === 'sos') {
    return await sendSOS(parentId, latitude, longitude);
  }
  
  return { error: 'unknown action' };
};

async function uploadLocation(parentId, lat, lng) {
  const db = cloudbase.database();
  
  // 保存位置
  const loc = await db.collection('location_history').add({
    data: {
      parentId,
      latitude: lat,
      longitude: lng,
      timestamp: new Date(),
      source: 'parent_manual'
    }
  });
  
  // 检查电子围栏
  const fences = await db.collection('geo_fences')
    .where({ parentId, enabled: true })
    .get();
  
  for (const fence of fences.data) {
    const dist = calculateDistance(lat, lng, fence.latitude, fence.longitude);
    if (dist > fence.radius) {
      await db.collection('sos_events').add({
        data: {
          parentId,
          type: 'geofence_breach',
          location: { latitude: lat, longitude: lng },
          fenceId: fence._id,
          detectedAt: new Date()
        }
      });
      break;
    }
  }
  
  return { success: true, locationId: loc._id };
}

async function sendSOS(parentId, lat, lng) {
  const db = cloudbase.database();
  
  const sos = await db.collection('sos_events').add({
    data: {
      parentId,
      type: 'manual_sos',
      location: { latitude: lat, longitude: lng },
      detectedAt: new Date()
    }
  });
  
  return { success: true, sosId: sos._id };
}
