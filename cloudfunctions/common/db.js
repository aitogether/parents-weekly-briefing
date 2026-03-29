/**
 * 云数据库封装
 * 每个云函数通过 cloud.database() 获取实例
 * 此模块提供常用查询/写入的快捷方法
 */
function getDB(cloud) {
  const db = cloud.database();
  const _ = db.command;

  return {
    db, _,

    // 用户
    async getUserByOpenId(open_id) {
      const r = await db.collection('users').where({ open_id }).limit(1).get();
      return r.data[0] || null;
    },
    async getUserById(id) {
      const r = await db.collection('users').doc(id).get().catch(() => null);
      return r?.data || null;
    },
    async createUser(data) {
      const r = await db.collection('users').add({ data: { ...data, created_at: db.serverDate() } });
      return { _id: r._id, ...data };
    },
    async getUserByInviteCode(code) {
      const r = await db.collection('users').where({ role: 'parent', invite_code: code }).limit(1).get();
      return r.data[0] || null;
    },
    async bindChildToParent(child_id, parent_id) {
      await db.collection('users').doc(child_id).update({ data: { bound_to: parent_id } });
      await db.collection('users').doc(parent_id).update({
        data: { bound_to: _.push(child_id) }
      });
    },

    // 用药计划
    async createMedPlan(data) {
      const r = await db.collection('medication_plans').add({ data: { ...data, created_at: db.serverDate() } });
      return { _id: r._id, ...data };
    },
    async getMedPlans(parent_id) {
      const r = await db.collection('medication_plans').where({ parent_id }).get();
      return r.data;
    },

    // 用药确认
    async confirmMed({ plan_id, parent_id, status, confirm_date }) {
      const db2 = db;
      const useDate = confirm_date || new Date().toISOString().slice(0, 10);
      // 去重：删除同一天同一计划的旧确认
      await db.collection('med_confirmations').where({
        plan_id, parent_id, confirmed_date: useDate
      }).remove().catch(() => {});
      const r = await db.collection('med_confirmations').add({
        data: {
          plan_id, parent_id, status,
          confirmed_date: useDate,
          confirmed_at: db2.serverDate()
        }
      });
      return { _id: r._id, plan_id, parent_id, status, confirmed_date: useDate };
    },
    async getMedConfirmations(parent_id, days = 7) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const r = await db.collection('med_confirmations').where({
        parent_id,
        confirmed_date: db.command.gte(since)
      }).get();
      return r.data;
    },

    // 微信运动
    async addWerunData({ parent_id, steps, data_date }) {
      const db2 = db;
      await db.collection('werun_data').where({
        parent_id, data_date
      }).remove().catch(() => {});
      const r = await db.collection('werun_data').add({
        data: { parent_id, steps, data_date, created_at: db2.serverDate() }
      });
      return { _id: r._id, parent_id, steps, data_date };
    },
    async getWerunData(parent_id, days = 7) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const r = await db.collection('werun_data').where({
        parent_id,
        data_date: db.command.gte(since)
      }).orderBy('data_date', 'asc').get();
      return r.data;
    },

    // 子女回声
    async addFeedback(data) {
      const r = await db.collection('child_feedback').add({
        data: { ...data, created_at: db.serverDate() }
      });
      return { _id: r._id, ...data };
    },
    async getLatestFeedback(parent_id, days = 7) {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const r = await db.collection('child_feedback').where({
        parent_id,
        created_at: db.command.gte(since)
      }).orderBy('created_at', 'desc').limit(1).get();
      return r.data[0] || null;
    }
  };
}

module.exports = { getDB };
