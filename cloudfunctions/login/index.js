const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const { getDB } = require('../common/db');
const { ROLES, INVITE_CHARS, INVITE_LENGTH } = require('../common/constants');
const R = require('../common/response');

function generateInviteCode() {
  let code = '';
  for (let i = 0; i < INVITE_LENGTH; i++) code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)];
  return code;
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  const db = getDB(cloud);
  const { action, role, nickname } = event;

  switch (action) {
    case 'login': {
      if (!role || !Object.values(ROLES).includes(role)) {
        return R.fail('role must be "child" or "parent"');
      }
      let user = await db.getUserByOpenId(OPENID);
      if (!user) {
        user = await db.createUser({
          open_id: OPENID,
          role,
          nickname: nickname || (role === ROLES.PARENT ? '爸爸/妈妈' : '子女'),
          invite_code: role === ROLES.PARENT ? generateInviteCode() : null,
          bound_to: role === ROLES.CHILD ? null : []
        });
      }
      return R.ok({
        user: {
          id: user._id,
          role: user.role,
          nickname: user.nickname,
          invite_code: user.invite_code,
          bound_to: user.bound_to
        }
      });
    }

    case 'profile': {
      const user = await db.getUserByOpenId(OPENID);
      if (!user) return R.fail('用户不存在', 401);
      const result = {
        id: user._id, role: user.role, nickname: user.nickname,
        invite_code: user.invite_code, bound_to: user.bound_to
      };
      if (user.role === ROLES.CHILD && user.bound_to) {
        const parent = await db.getUserById(user.bound_to);
        if (parent) result.parent = { id: parent._id, nickname: parent.nickname };
      }
      if (user.role === ROLES.PARENT && Array.isArray(user.bound_to)) {
        const children = await Promise.all(user.bound_to.map(id => db.getUserById(id)));
        result.children = children.filter(Boolean).map(c => ({ id: c._id, nickname: c.nickname }));
      }
      return R.ok(result);
    }

    case 'seedParent': {
      const user = await db.createUser({
        open_id: 'mock_' + Date.now(),
        role: ROLES.PARENT,
        nickname: nickname || '妈妈',
        invite_code: generateInviteCode(),
        bound_to: []
      });
      return R.ok({ user: { id: user._id, nickname: user.nickname, invite_code: user.invite_code } });
    }

    default:
      return R.fail('unknown action: ' + action);
  }
};
