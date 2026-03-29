const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const R = require('../common/response');

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = getDB(cloud);

  switch (event.action) {
    case 'bind': {
      const user = await db.getUserByOpenId(OPENID);
      if (!user) return R.fail('未登录', 401);
      if (user.role !== 'child') return R.fail('只有子女可以绑定父母', 403);
      const { invite_code } = event;
      if (!invite_code) return R.fail('invite_code required');
      const parent = await db.getUserByInviteCode(invite_code.toUpperCase());
      if (!parent) return R.fail('邀请码无效，请向父母确认', 404);
      await db.bindChildToParent(user._id, parent._id);
      return R.ok({ parent: { id: parent._id, nickname: parent.nickname } });
    }

    default:
      return R.fail('unknown action: ' + event.action);
  }
};
