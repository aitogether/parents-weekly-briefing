     1|/**
     2| * 云数据库封装
     3| * 每个云函数通过 cloud.database() 获取实例
     4| * 此模块提供常用查询/写入的快捷方法
     5| */
     6|function getDB(cloud) {
     7|  const db = cloud.database();
     8|  const _ = db.command;
     9|
    10|  return {
    11|    db, _,
    12|
    13|    // ==================== 用户 ====================
    14|    async getUserByOpenId(open_id) {
    15|      const r = await db.collection('users').where({ open_id }).limit(1).get();
    16|      return r.data[0] || null;
    17|    },
    18|    async getUserById(id) {
    19|      const r = await db.collection('users').doc(id).get().catch(() => null);
    20|      return r?.data || null;
    21|    },
    22|    async createUser(data) {
    23|      const r = await db.collection('users').add({ data: { ...data, created_at: db.serverDate() } });
    24|      return { _id: r._id, ...data };
    25|    },
    26|    async getUserByInviteCode(code) {
    27|      const r = await db.collection('users').where({ role: 'parent', invite_code: code }).limit(1).get();
    28|      return r.data[0] || null;
    29|    },
    30|    async bindChildToParent(child_id, parent_id) {
    31|      await db.collection('users').doc(child_id).update({ data: { bound_to: parent_id } });
    32|      await db.collection('users').doc(parent_id).update({
    33|        data: { bound_to: _.push(child_id) }
    34|      });
    35|    },
    36|
    37|    // ==================== 用药计划 ====================
    38|    async createMedPlan(data) {
    39|      const r = await db.collection('medication_plans').add({ data: { ...data, created_at: db.serverDate() } });
    40|      return { _id: r._id, ...data };
    41|    },
    42|    async getMedPlans(parent_id) {
    43|      const r = await db.collection('medication_plans').where({ parent_id }).get();
    44|      return r.data;
    45|    },
    46|
    47|    // ==================== 用药确认 ====================
    48|    async confirmMed({ plan_id, parent_id, status, confirm_date }) {
    49|      const db2 = db;
    50|      const useDate = confirm_date || new Date().toISOString().slice(0, 10);
    51|      // 去重：删除同一天同一计划的旧确认
    52|      await db.collection('med_confirmations').where({
    53|        plan_id, parent_id, confirmed_date: useDate
    54|      }).remove().catch(() => {});
    55|      const r = await db.collection('med_confirmations').add({
    56|        data: {
    57|          plan_id, parent_id, status,
    58|          confirmed_date: useDate,
    59|          confirmed_at: db2.serverDate()
    60|        }
    61|      });
    62|      return { _id: r._id, plan_id, parent_id, status, confirmed_date: useDate };
    63|    },
    64|    async getMedConfirmations(parent_id, days = 7) {
    65|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    66|      const r = await db.collection('med_confirmations').where({
    67|        parent_id,
    68|        confirmed_date: db.command.gte(since)
    69|      }).get();
    70|      return r.data;
    71|    },
    72|
    73|    // ==================== v0.2 每日确认（一键确认）====================
    74|    async addDailyConfirm({ parent_id, date, med_taken }) {
    75|      const db2 = db;
    76|      const useDate = date || new Date().toISOString().slice(0, 10);
    77|      // 去重
    78|      await db.collection('daily_confirms').where({
    79|        parent_id, date: useDate
    80|      }).remove().catch(() => {});
    81|      const r = await db.collection('daily_confirms').add({
    82|        data: {
    83|          parent_id,
    84|          date: useDate,
    85|          med_taken: med_taken ? 1 : 0,
    86|          confirmed_at: db2.serverDate()
    87|        }
    88|      });
    89|      return { _id: r._id, parent_id, date: useDate, med_taken };
    90|    },
    91|    async getDailyConfirms(parent_id, days = 7) {
    92|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    93|      const r = await db.collection('daily_confirms').where({
    94|        parent_id,
    95|        date: db.command.gte(since)
    96|      }).get();
    97|      return r.data;
    98|    },
    99|
   100|    // ==================== v0.2 每周用药确认 ====================
   101|    async addWeeklyMedConfirm({ parent_id, date, answer }) {
   102|      const useDate = date || new Date().toISOString().slice(0, 10);
   103|      // 去重
   104|      await db.collection('weekly_med_confirms').where({
   105|        parent_id, date: useDate
   106|      }).remove().catch(() => {});
   107|      const r = await db.collection('weekly_med_confirms').add({
   108|        data: {
   109|          parent_id,
   110|          date: useDate,
   111|          answer,
   112|          confirmed_at: db.serverDate()
   113|        }
   114|      });
   115|      return { _id: r._id, parent_id, date: useDate, answer };
   116|    },
   117|
   118|    // ==================== v0.2 用药提醒设置 ====================
   119|    async getReminderSettings(parent_id) {
   120|      const r = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();
   121|      if (r.data.length === 0) return null;
   122|      const doc = r.data[0];
   123|      return {
   124|        ...doc,
   125|        reminder_times: doc.reminder_times || []
   126|      };
   127|    },
   128|    async saveReminderSettings(parent_id, reminder_times) {
   129|      const now = new Date().toISOString();
   130|      const existing = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();
   131|
   132|      if (existing.data.length > 0) {
   133|        const doc = existing.data[0];
   134|        await db.collection('reminder_settings').doc(doc._id).update({
   135|          data: {
   136|            reminder_times: reminder_times,
   137|            updated_at: now
   138|          }
   139|        });
   140|      } else {
   141|        await db.collection('reminder_settings').add({
   142|          data: {
   143|            parent_id,
   144|            reminder_times,
   145|            subscribe_authorized: false,
   146|            created_at: now,
   147|            updated_at: now
   148|          }
   149|        });
   150|      }
   151|      return this.getReminderSettings(parent_id);
   152|    },
   153|
   154|    // ==================== 微信运动 ====================
   155|    async addWerunData({ parent_id, steps, data_date }) {
   156|      const db2 = db;
   157|      await db.collection('werun_data').where({
   158|        parent_id, data_date
   159|      }).remove().catch(() => {});
   160|      const r = await db.collection('werun_data').add({
   161|        data: { parent_id, steps, data_date, created_at: db2.serverDate() }
   162|      });
   163|      return { _id: r._id, parent_id, steps, data_date };
   164|    },
   165|    async getWerunData(parent_id, days = 7) {
   166|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
   167|      const r = await db.collection('werun_data').where({
   168|        parent_id,
   169|        data_date: db.command.gte(since)
   170|      }).orderBy('data_date', 'asc').get();
   171|      return r.data;
   172|    },

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

   173|
   174|    // ==================== 子女回声 ====================
   175|    async addFeedback(data) {
   176|      const r = await db.collection('child_feedback').add({
   177|        data: { ...data, created_at: db.serverDate() }
   178|      });
   179|      return { _id: r._id, ...data };
   180|    },
   181|    async getLatestFeedback(parent_id, days = 7) {
   182|      const since = new Date(Date.now() - days * 86400000).toISOString();
   183|      const r = await db.collection('child_feedback').where({
   184|        parent_id,
   185|        created_at: db.command.gte(since)
   186|      }).orderBy('created_at', 'desc').limit(1).get();
   187|      return r.data[0] || null;
   188|    },
   189|
   190|    // ==================== 安全检查清单（P1 任务3）====================
   191|    async getWeeklyChecklist(uid, weekStart) {
   192|      const r = await db.collection('safety_checklists').where({
   193|        user_id: uid,
   194|        week_start: weekStart
   195|      }).get();
   196|      return r.data;
   197|    },
   198|    async completeChecklistItem(uid, weekStart, itemId, notes = '') {
   199|      const now = new Date().toISOString();
   200|      const existing = await db.collection('safety_checklists').where({
   201|        user_id: uid,
   202|        week_start: weekStart,
   203|        item_id: itemId
   204|      }).limit(1).get();
   205|
   206|      if (existing.data.length > 0) {
   207|        const doc = existing.data[0];
   208|        await db.collection('safety_checklists').doc(doc._id).update({
   209|          data: {
   210|            completed: true,
   211|            completed_at: now,
   212|            notes,
   213|            updated_at: now
   214|          }
   215|        });
   216|        return { changes: 1 };
   217|      } else {
   218|        const CHECKLIST_ITEMS = [
   219|          { id: 1, name: "检查燃气阀门是否关闭" },
   220|          { id: 2, name: "检查水龙头是否关紧" },
   221|          { id: 3, name: "检查电源插座是否拔除" },
   222|          { id: 4, name: "检查窗户是否锁好" },
   223|          { id: 5, name: "确认紧急联系人可见" },
   224|          { id: 6, name: "检查楼梯扶手稳固" },
   225|          { id: 7, name: "确认药品存放在阴凉处" },
   226|          { id: 8, name: "检查烟雾报警器电池" }
   227|        ];
   228|        const itemName = CHECKLIST_ITEMS.find(i => i.id === itemId)?.name || '';
   229|        const r = await db.collection('safety_checklists').add({
   230|          data: {
   231|            user_id: uid,
   232|            week_start: weekStart,
   233|            item_id: itemId,
   234|            item_name: itemName,
   235|            completed: true,
   236|            completed_at: now,
   237|            notes,
   238|            created_at: now,
   239|            updated_at: now
   240|          }
   241|        });
   242|        return { _id: r._id, changes: 1 };
   243|      }
   244|    },
   245|    async getChecklistHistory(uid, limit = 4) {
   246|      const r = await db.collection('safety_checklists')
   247|        .where({ user_id: uid })
   248|        .orderBy('week_start', 'desc')
   249|        .limit(100)
   250|        .get();
   251|
   252|      const weeks = {};
   253|      r.data.forEach(rec => {
   254|        const ws = rec.week_start;
   255|        if (!weeks[ws]) weeks[ws] = { week_start: ws, total: 0, done: 0 };
   256|        weeks[ws].total++;
   257|        if (rec.completed) weeks[ws].done++;
   258|      });
   259|
   260|      return Object.values(weeks)
   261|        .sort((a, b) => b.week_start.localeCompare(a.week_start))
   262|        .slice(0, limit);
   263|    },
   264|
   265|    // ==================== 焦虑量表（P1-7）====================
   266|    async addAnxietySurvey({ child_id, answers, submitted_at }) {
   267|      const db2 = db;
   268|      // 答案需要加密（云函数中已加密传递，此处直接存储）
   269|      const r = await db.collection('anxiety_surveys').add({
   270|        data: {
   271|          child_id,
   272|          answers_enc: JSON.stringify(answers), // 简化：JSON存储，实际应加密
   273|          submitted_at: submitted_at || db2.serverDate()
   274|        }
   275|      });
   276|      return { _id: r._id, child_id, answers, submitted_at };
   277|    },
   278|    async getAnxietyHistory(child_id, limit = 10) {
   279|      const r = await db.collection('anxiety_surveys')
   280|        .where({ child_id })
   281|        .orderBy('submitted_at', 'desc')
   282|        .limit(limit)
   283|        .get();
   284|      return r.data.map(item => ({
   285|        ...item,
   286|        answers: JSON.parse(item.answers_enc || '[]')
   287|      }));
   288|    }
   289|  };
   290|}
   291|
   292|module.exports = { getDB };
   293|