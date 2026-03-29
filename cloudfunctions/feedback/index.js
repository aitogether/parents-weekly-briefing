const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const { FEEDBACK_OPTIONS } = require('../common/constants');
const R = require('../common/response');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = getDB(cloud);

  switch (event.action) {
    case 'options':
      return R.ok({ options: FEEDBACK_OPTIONS });

    case 'submit': {
      const { child_id, parent_id, feedback_type, report_id } = event;
      if (!child_id || !parent_id || !feedback_type) return R.fail('child_id, parent_id, feedback_type required');
      const option = FEEDBACK_OPTIONS.find(o => o.type === feedback_type);
      if (!option) return R.fail('feedback_type must be: ' + FEEDBACK_OPTIONS.map(o => o.type).join(', '));
      const record = await db.addFeedback({ child_id, parent_id, feedback_type, report_id });
      return R.ok({ feedback: record, text: option.text });
    }

    case 'latest': {
      const { parent_id } = event;
      if (!parent_id) return R.fail('parent_id required');
      const latest = await db.getLatestFeedback(parent_id, 7);
      if (!latest) return R.ok({ has_feedback: false });
      const option = FEEDBACK_OPTIONS.find(o => o.type === latest.feedback_type);
      return R.ok({
        has_feedback: true,
        text: option ? option.text : latest.feedback_type,
        created_at: latest.created_at
      });
    }

    default:
      return R.fail('unknown action: ' + event.action);
  }
};
