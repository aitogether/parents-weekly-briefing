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

    // ==================== 用户 ====================
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

    // ==================== 用药计划 ====================
    async createMedPlan(data) {
      const r = await db.collection('medication_plans').add({ data: { ...data, created_at: db.serverDate() } });
      return { _id: r._id, ...data };
    },
    async getMedPlans(parent_id) {
      const r = await db.collection('medication_plans').where({ parent_id }).get();
      return r.data;
    },

    // ==================== 用药确认 ====================
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

    // ==================== v0.2 每日确认（一键确认）====================
    async addDailyConfirm({ parent_id, date, med_taken }) {
      const db2 = db;
      const useDate = date || new Date().toISOString().slice(0, 10);
      // 去重
      await db.collection('daily_confirms').where({
        parent_id, date: useDate
      }).remove().catch(() => {});
      const r = await db.collection('daily_confirms').add({
        data: {
          parent_id,
          date: useDate,
          med_taken: med_taken ? 1 : 0,
          confirmed_at: db2.serverDate()
        }
      });
      return { _id: r._id, parent_id, date: useDate, med_taken };
    },
    async getDailyConfirms(parent_id, days = 7) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const r = await db.collection('daily_confirms').where({
        parent_id,
        date: db.command.gte(since)
      }).get();
      return r.data;
    },

    // ==================== v0.2 每周用药确认 ====================
    async addWeeklyMedConfirm({ parent_id, date, answer }) {
      const useDate = date || new Date().toISOString().slice(0, 10);
      // 去重
      await db.collection('weekly_med_confirms').where({
        parent_id, date: useDate
      }).remove().catch(() => {});
      const r = await db.collection('weekly_med_confirms').add({
        data: {
          parent_id,
          date: useDate,
          answer,
          confirmed_at: db.serverDate()
        }
      });
      return { _id: r._id, parent_id, date: useDate, answer };
    },

    // ==================== v0.2 用药提醒设置 ====================
    async getReminderSettings(parent_id) {
      const r = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();
      if (r.data.length === 0) return null;
      const doc = r.data[0];
      return {
        ...doc,
        reminder_times: doc.reminder_times || []
      };
    },
    async saveReminderSettings(parent_id, reminder_times) {
      const now = new Date().toISOString();
      const existing = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();

      if (existing.data.length > 0) {
        const doc = existing.data[0];
        await db.collection('reminder_settings').doc(doc._id).update({
          data: {
            reminder_times: reminder_times,
            updated_at: now
          }
        });
      } else {
        await db.collection('reminder_settings').add({
          data: {
            parent_id,
            reminder_times,
            subscribe_authorized: false,
            created_at: now,
            updated_at: now
          }
        });
      }
      return this.getReminderSettings(parent_id);
    },

    // ==================== 微信运动 ====================
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

    // ==================== 扫码帮手 ====================
    async scanQRCode({ parent_id, qr_type, qr_value, scanned_at }) {
      const db2 = db;
      const useDate = scanned_at || new Date().toISOString().slice(0, 10);

      // 去重：同一天同一二维码只保留最新扫描
      await db.collection('qr_scans')
        .where({ parent_id, qr_type, qr_value, scanned_date: useDate })
        .remove()
        .catch(() => {});

      const r = await db.collection('qr_scans').add({
        data: {
          parent_id,
          qr_type,
          qr_value,
          scanned_date: useDate,
          scanned_at: db2.serverDate()
        }
      });
      return { _id: r._id, parent_id, qr_type, qr_value, scanned_date: useDate };
    },

    async getQRScans(parent_id, days = 30) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const r = await db.collection('qr_scans')
        .where({
          parent_id,
          scanned_date: db.command.gte(since)
        })
        .orderBy('scanned_at', 'desc')
        .limit(100)
        .get();
      return r.data;
    },

    // ==================== 叫车帮手 ====================
    async createTaxiRequest({ parent_id, destination, scheduled_time, notes }) {
      const now = new Date().toISOString();
      const r = await db.collection('taxi_requests').add({
        data: {
          parent_id,
          destination,
          scheduled_time: scheduled_time || now,
          notes: notes || '',
          status: 'pending',  // pending, assigned, completed, cancelled
          created_at: db.serverDate(),
          updated_at: now
        }
      });
      return { _id: r._id, parent_id, destination, status: 'pending' };
    },

    async getTaxiRequests(parent_id, status = null, limit = 20) {
      let query = db.collection('taxi_requests')
        .where({ parent_id })
        .orderBy('created_at', 'desc')
        .limit(limit);

      if (status) {
        query = query.where({ status });
      }

      const r = await query.get();
      return r.data;
    },

    async updateTaxiStatus(request_id, status, notes = null) {
      const updateData = { status, updated_at: new Date().toISOString() };
      if (notes) updateData.notes = notes;

      await db.collection('taxi_requests').doc(request_id).update({ data: updateData });
      const r = await db.collection('taxi_requests').doc(request_id).get();
      return r.data;
    },

    async getTaxiStats(parent_id, days = 30) {
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const r = await db.collection('taxi_requests')
        .where({
          parent_id,
          created_at: db.command.gte(since)
        })
        .get();
      const data = r.data;
      return {
        total: data.length,
        completed: data.filter(t => t.status === 'completed').length,
        pending: data.filter(t => t.status === 'pending').length,
        cancelled: data.filter(t => t.status === 'cancelled').length
      };
    },

    // ==================== 子女回声 ====================
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
    },

    // ==================== 安全检查清单（P1 任务3）====================
    async getWeeklyChecklist(uid, weekStart) {
      const r = await db.collection('safety_checklists').where({
        user_id: uid,
        week_start: weekStart
      }).get();
      return r.data;
    },
    async completeChecklistItem(uid, weekStart, itemId, notes = '') {
      const now = new Date().toISOString();
      const existing = await db.collection('safety_checklists').where({
        user_id: uid,
        week_start: weekStart,
        item_id: itemId
      }).limit(1).get();

      if (existing.data.length > 0) {
        const doc = existing.data[0];
        await db.collection('safety_checklists').doc(doc._id).update({
          data: {
            completed: true,
            completed_at: now,
            notes,
            updated_at: now
          }
        });
        return { changes: 1 };
      } else {
        const CHECKLIST_ITEMS = [
          { id: 1, name: "检查燃气阀门是否关闭" },
          { id: 2, name: "检查水龙头是否关紧" },
          { id: 3, name: "检查电源插座是否拔除" },
          { id: 4, name: "检查窗户是否锁好" },
          { id: 5, name: "确认紧急联系人可见" },
          { id: 6, name: "检查楼梯扶手稳固" },
          { id: 7, name: "确认药品存放在阴凉处" },
          { id: 8, name: "检查烟雾报警器电池" }
        ];
        const itemName = CHECKLIST_ITEMS.find(i => i.id === itemId)?.name || '';
        const r = await db.collection('safety_checklists').add({
          data: {
            user_id: uid,
            week_start: weekStart,
            item_id: itemId,
            item_name: itemName,
            completed: true,
            completed_at: now,
            notes,
            created_at: now,
            updated_at: now
          }
        });
        return { _id: r._id, changes: 1 };
      }
    },
    async getChecklistHistory(uid, limit = 4) {
      const r = await db.collection('safety_checklists')
        .where({ user_id: uid })
        .orderBy('week_start', 'desc')
        .limit(100)
        .get();

      const weeks = {};
      r.data.forEach(rec => {
        const ws = rec.week_start;
        if (!weeks[ws]) weeks[ws] = { week_start: ws, total: 0, done: 0 };
        weeks[ws].total++;
        if (rec.completed) weeks[ws].done++;
      });

      return Object.values(weeks)
        .sort((a, b) => b.week_start.localeCompare(a.week_start))
        .slice(0, limit);
    },

    // ==================== 焦虑量表（P1-7）====================
    async addAnxietySurvey({ child_id, answers, submitted_at }) {
      const db2 = db;
      // 答案需要加密（云函数中已加密传递，此处直接存储）
      const r = await db.collection('anxiety_surveys').add({
        data: {
          child_id,
          answers_enc: JSON.stringify(answers), // 简化：JSON存储，实际应加密
          submitted_at: submitted_at || db2.serverDate()
        }
      });
      return { _id: r._id, child_id, answers, submitted_at };
    },
    async getAnxietyHistory(child_id, limit = 10) {
      const r = await db.collection('anxiety_surveys')
        .where({ child_id })
        .orderBy('submitted_at', 'desc')
        .limit(limit)
        .get();
      return r.data.map(item => ({
        ...item,
        answers: JSON.parse(item.answers_enc || '[]')
      }));
    }
  };
}

module.exports = { getDB };