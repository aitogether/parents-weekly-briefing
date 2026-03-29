const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

exports.main = async (event, context) => {
  const db = getDB(cloud);

  switch (event.action) {
    case 'decrypt': {
      const { parent_id, steps, data_date } = event;
      if (!parent_id) return R.fail('parent_id required');
      const useDate = data_date || new Date().toISOString().slice(0, 10);
      const useSteps = typeof steps === 'number' ? steps : Math.floor(Math.random() * 5000) + 1000;
      const record = await db.addWerunData({ parent_id, steps: useSteps, data_date: useDate });
      return R.ok({ data: record, note: 'mock' });
    }

    case 'getSteps': {
      const { parent_id, days = 7 } = event;
      if (!parent_id) return R.fail('parent_id required');
      const rows = await db.getWerunData(parent_id, days);
      return R.ok({
        parent_id,
        steps: rows.map(r => ({ date: r.data_date, step_count: r.steps }))
      });
    }

    default:
      return R.fail('unknown action: ' + event.action);
  }
};
