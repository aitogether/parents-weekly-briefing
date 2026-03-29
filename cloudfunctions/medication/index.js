const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const { CONFIRM_STATUS } = require('../common/constants');
const R = require('../common/response');

exports.main = async (event, context) => {
  const db = getDB(cloud);

  switch (event.action) {
    case 'createPlan': {
      const { parent_id, nickname, dosage, schedule } = event;
      if (!parent_id || !nickname || !dosage || !schedule) return R.fail('parent_id, nickname, dosage, schedule required');
      const plan = await db.createMedPlan({ parent_id, nickname, dosage, schedule });
      return R.ok({ plan });
    }

    case 'getPlans': {
      const { parent_id } = event;
      if (!parent_id) return R.fail('parent_id required');
      const plans = await db.getMedPlans(parent_id);
      return R.ok({ plans });
    }

    case 'confirm': {
      const { plan_id, parent_id, role, status, confirm_date } = event;
      if (role !== 'parent') return R.fail('Only parent role can confirm', 403);
      if (!plan_id || !parent_id || !status) return R.fail('plan_id, parent_id, status required');
      if (!Object.values(CONFIRM_STATUS).includes(status)) return R.fail('status must be "taken" or "skipped"');
      const record = await db.confirmMed({ plan_id, parent_id, status, confirm_date });
      return R.ok({ confirmation: record });
    }

    case 'stats': {
      const { parent_id, days = 7 } = event;
      if (!parent_id) return R.fail('parent_id required');
      const records = await db.getMedConfirmations(parent_id, days);
      const taken = records.filter(r => r.status === CONFIRM_STATUS.TAKEN).length;
      return R.ok({
        parent_id, days, total: records.length, taken,
        skipped: records.length - taken,
        completion_rate: Math.round((taken / days) * 100)
      });
    }

    default:
      return R.fail('unknown action: ' + event.action);
  }
};
