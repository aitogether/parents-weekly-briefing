     1|     1|/**
     2|     2| * 云数据库封装
     3|     3| * 每个云函数通过 cloud.database() 获取实例
     4|     4| * 此模块提供常用查询/写入的快捷方法
     5|     5| */
     6|     6|function getDB(cloud) {
     7|     7|  const db = cloud.database();
     8|     8|  const _ = db.command;
     9|     9|
    10|    10|  return {
    11|    11|    db, _,
    12|    12|
    13|    13|    // ==================== 用户 ====================
    14|    14|    async getUserByOpenId(open_id) {
    15|    15|      const r = await db.collection('users').where({ open_id }).limit(1).get();
    16|    16|      return r.data[0] || null;
    17|    17|    },
    18|    18|    async getUserById(id) {
    19|    19|      const r = await db.collection('users').doc(id).get().catch(() => null);
    20|    20|      return r?.data || null;
    21|    21|    },
    22|    22|    async createUser(data) {
    23|    23|      const r = await db.collection('users').add({ data: { ...data, created_at: db.serverDate() } });
    24|    24|      return { _id: r._id, ...data };
    25|    25|    },
    26|    26|    async getUserByInviteCode(code) {
    27|    27|      const r = await db.collection('users').where({ role: 'parent', invite_code: code }).limit(1).get();
    28|    28|      return r.data[0] || null;
    29|    29|    },
    30|    30|    async bindChildToParent(child_id, parent_id) {
    31|    31|      await db.collection('users').doc(child_id).update({ data: { bound_to: parent_id } });
    32|    32|      await db.collection('users').doc(parent_id).update({
    33|    33|        data: { bound_to: _.push(child_id) }
    34|    34|      });
    35|    35|    },
    36|    36|
    37|    37|    // ==================== 用药计划 ====================
    38|    38|    async createMedPlan(data) {
    39|    39|      const r = await db.collection('medication_plans').add({ data: { ...data, created_at: db.serverDate() } });
    40|    40|      return { _id: r._id, ...data };
    41|    41|    },
    42|    42|    async getMedPlans(parent_id) {
    43|    43|      const r = await db.collection('medication_plans').where({ parent_id }).get();
    44|    44|      return r.data;
    45|    45|    },
    46|    46|
    47|    47|    // ==================== 用药确认 ====================
    48|    48|    async confirmMed({ plan_id, parent_id, status, confirm_date }) {
    49|    49|      const db2 = db;
    50|    50|      const useDate = confirm_date || new Date().toISOString().slice(0, 10);
    51|    51|      // 去重：删除同一天同一计划的旧确认
    52|    52|      await db.collection('med_confirmations').where({
    53|    53|        plan_id, parent_id, confirmed_date: useDate
    54|    54|      }).remove().catch(() => {});
    55|    55|      const r = await db.collection('med_confirmations').add({
    56|    56|        data: {
    57|    57|          plan_id, parent_id, status,
    58|    58|          confirmed_date: useDate,
    59|    59|          confirmed_at: db2.serverDate()
    60|    60|        }
    61|    61|      });
    62|    62|      return { _id: r._id, plan_id, parent_id, status, confirmed_date: useDate };
    63|    63|    },
    64|    64|    async getMedConfirmations(parent_id, days = 7) {
    65|    65|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    66|    66|      const r = await db.collection('med_confirmations').where({
    67|    67|        parent_id,
    68|    68|        confirmed_date: db.command.gte(since)
    69|    69|      }).get();
    70|    70|      return r.data;
    71|    71|    },
    72|    72|
    73|    73|    // ==================== v0.2 每日确认（一键确认）====================
    74|    74|    async addDailyConfirm({ parent_id, date, med_taken }) {
    75|    75|      const db2 = db;
    76|    76|      const useDate = date || new Date().toISOString().slice(0, 10);
    77|    77|      // 去重
    78|    78|      await db.collection('daily_confirms').where({
    79|    79|        parent_id, date: useDate
    80|    80|      }).remove().catch(() => {});
    81|    81|      const r = await db.collection('daily_confirms').add({
    82|    82|        data: {
    83|    83|          parent_id,
    84|    84|          date: useDate,
    85|    85|          med_taken: med_taken ? 1 : 0,
    86|    86|          confirmed_at: db2.serverDate()
    87|    87|        }
    88|    88|      });
    89|    89|      return { _id: r._id, parent_id, date: useDate, med_taken };
    90|    90|    },
    91|    91|    async getDailyConfirms(parent_id, days = 7) {
    92|    92|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    93|    93|      const r = await db.collection('daily_confirms').where({
    94|    94|        parent_id,
    95|    95|        date: db.command.gte(since)
    96|    96|      }).get();
    97|    97|      return r.data;
    98|    98|    },
    99|    99|
   100|   100|    // ==================== v0.2 每周用药确认 ====================
   101|   101|    async addWeeklyMedConfirm({ parent_id, date, answer }) {
   102|   102|      const useDate = date || new Date().toISOString().slice(0, 10);
   103|   103|      // 去重
   104|   104|      await db.collection('weekly_med_confirms').where({
   105|   105|        parent_id, date: useDate
   106|   106|      }).remove().catch(() => {});
   107|   107|      const r = await db.collection('weekly_med_confirms').add({
   108|   108|        data: {
   109|   109|          parent_id,
   110|   110|          date: useDate,
   111|   111|          answer,
   112|   112|          confirmed_at: db.serverDate()
   113|   113|        }
   114|   114|      });
   115|   115|      return { _id: r._id, parent_id, date: useDate, answer };
   116|   116|    },
   117|   117|
   118|   118|    // ==================== v0.2 用药提醒设置 ====================
   119|   119|    async getReminderSettings(parent_id) {
   120|   120|      const r = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();
   121|   121|      if (r.data.length === 0) return null;
   122|   122|      const doc = r.data[0];
   123|   123|      return {
   124|   124|        ...doc,
   125|   125|        reminder_times: doc.reminder_times || []
   126|   126|      };
   127|   127|    },
   128|   128|    async saveReminderSettings(parent_id, reminder_times) {
   129|   129|      const now = new Date().toISOString();
   130|   130|      const existing = await db.collection('reminder_settings').where({ parent_id }).limit(1).get();
   131|   131|
   132|   132|      if (existing.data.length > 0) {
   133|   133|        const doc = existing.data[0];
   134|   134|        await db.collection('reminder_settings').doc(doc._id).update({
   135|   135|          data: {
   136|   136|            reminder_times: reminder_times,
   137|   137|            updated_at: now
   138|   138|          }
   139|   139|        });
   140|   140|      } else {
   141|   141|        await db.collection('reminder_settings').add({
   142|   142|          data: {
   143|   143|            parent_id,
   144|   144|            reminder_times,
   145|   145|            subscribe_authorized: false,
   146|   146|            created_at: now,
   147|   147|            updated_at: now
   148|   148|          }
   149|   149|        });
   150|   150|      }
   151|   151|      return this.getReminderSettings(parent_id);
   152|   152|    },
   153|   153|
   154|   154|    // ==================== 微信运动 ====================
   155|   155|    async addWerunData({ parent_id, steps, data_date }) {
   156|   156|      const db2 = db;
   157|   157|      await db.collection('werun_data').where({
   158|   158|        parent_id, data_date
   159|   159|      }).remove().catch(() => {});
   160|   160|      const r = await db.collection('werun_data').add({
   161|   161|        data: { parent_id, steps, data_date, created_at: db2.serverDate() }
   162|   162|      });
   163|   163|      return { _id: r._id, parent_id, steps, data_date };
   164|   164|    },
   165|   165|    async getWerunData(parent_id, days = 7) {
   166|   166|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
   167|   167|      const r = await db.collection('werun_data').where({
   168|   168|        parent_id,
   169|   169|        data_date: db.command.gte(since)
   170|   170|      }).orderBy('data_date', 'asc').get();
   171|   171|      return r.data;
   172|   172|    },
   173|
   174|    // ==================== 扫码帮手 ====================
   175|    async scanQRCode({ parent_id, qr_type, qr_value, scanned_at }) {
   176|      const db2 = db;
   177|      const useDate = scanned_at || new Date().toISOString().slice(0, 10);
   178|      
   179|      // 去重：同一天同一二维码只保留最新扫描
   180|      await db.collection('qr_scans')
   181|        .where({ parent_id, qr_type, qr_value, scanned_date: useDate })
   182|        .remove()
   183|        .catch(() => {});
   184|      
   185|      const r = await db.collection('qr_scans').add({
   186|        data: {
   187|          parent_id,
   188|          qr_type,
   189|          qr_value,
   190|          scanned_date: useDate,
   191|          scanned_at: db2.serverDate()
   192|        }
   193|      });
   194|      return { _id: r._id, parent_id, qr_type, qr_value, scanned_date: useDate };
   195|    },
   196|
   197|    async getQRScans(parent_id, days = 30) {
   198|      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
   199|      const r = await db.collection('qr_scans')
   200|        .where({
   201|          parent_id,
   202|          scanned_date: db.command.gte(since)
   203|        })
   204|        .orderBy('scanned_at', 'desc')
   205|        .limit(100)
   206|        .get();
   207|      return r.data;
   208|    },

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

   209|
   210|   173|
   211|   174|    // ==================== 子女回声 ====================
   212|   175|    async addFeedback(data) {
   213|   176|      const r = await db.collection('child_feedback').add({
   214|   177|        data: { ...data, created_at: db.serverDate() }
   215|   178|      });
   216|   179|      return { _id: r._id, ...data };
   217|   180|    },
   218|   181|    async getLatestFeedback(parent_id, days = 7) {
   219|   182|      const since = new Date(Date.now() - days * 86400000).toISOString();
   220|   183|      const r = await db.collection('child_feedback').where({
   221|   184|        parent_id,
   222|   185|        created_at: db.command.gte(since)
   223|   186|      }).orderBy('created_at', 'desc').limit(1).get();
   224|   187|      return r.data[0] || null;
   225|   188|    },
   226|   189|
   227|   190|    // ==================== 安全检查清单（P1 任务3）====================
   228|   191|    async getWeeklyChecklist(uid, weekStart) {
   229|   192|      const r = await db.collection('safety_checklists').where({
   230|   193|        user_id: uid,
   231|   194|        week_start: weekStart
   232|   195|      }).get();
   233|   196|      return r.data;
   234|   197|    },
   235|   198|    async completeChecklistItem(uid, weekStart, itemId, notes = '') {
   236|   199|      const now = new Date().toISOString();
   237|   200|      const existing = await db.collection('safety_checklists').where({
   238|   201|        user_id: uid,
   239|   202|        week_start: weekStart,
   240|   203|        item_id: itemId
   241|   204|      }).limit(1).get();
   242|   205|
   243|   206|      if (existing.data.length > 0) {
   244|   207|        const doc = existing.data[0];
   245|   208|        await db.collection('safety_checklists').doc(doc._id).update({
   246|   209|          data: {
   247|   210|            completed: true,
   248|   211|            completed_at: now,
   249|   212|            notes,
   250|   213|            updated_at: now
   251|   214|          }
   252|   215|        });
   253|   216|        return { changes: 1 };
   254|   217|      } else {
   255|   218|        const CHECKLIST_ITEMS = [
   256|   219|          { id: 1, name: "检查燃气阀门是否关闭" },
   257|   220|          { id: 2, name: "检查水龙头是否关紧" },
   258|   221|          { id: 3, name: "检查电源插座是否拔除" },
   259|   222|          { id: 4, name: "检查窗户是否锁好" },
   260|   223|          { id: 5, name: "确认紧急联系人可见" },
   261|   224|          { id: 6, name: "检查楼梯扶手稳固" },
   262|   225|          { id: 7, name: "确认药品存放在阴凉处" },
   263|   226|          { id: 8, name: "检查烟雾报警器电池" }
   264|   227|        ];
   265|   228|        const itemName = CHECKLIST_ITEMS.find(i => i.id === itemId)?.name || '';
   266|   229|        const r = await db.collection('safety_checklists').add({
   267|   230|          data: {
   268|   231|            user_id: uid,
   269|   232|            week_start: weekStart,
   270|   233|            item_id: itemId,
   271|   234|            item_name: itemName,
   272|   235|            completed: true,
   273|   236|            completed_at: now,
   274|   237|            notes,
   275|   238|            created_at: now,
   276|   239|            updated_at: now
   277|   240|          }
   278|   241|        });
   279|   242|        return { _id: r._id, changes: 1 };
   280|   243|      }
   281|   244|    },
   282|   245|    async getChecklistHistory(uid, limit = 4) {
   283|   246|      const r = await db.collection('safety_checklists')
   284|   247|        .where({ user_id: uid })
   285|   248|        .orderBy('week_start', 'desc')
   286|   249|        .limit(100)
   287|   250|        .get();
   288|   251|
   289|   252|      const weeks = {};
   290|   253|      r.data.forEach(rec => {
   291|   254|        const ws = rec.week_start;
   292|   255|        if (!weeks[ws]) weeks[ws] = { week_start: ws, total: 0, done: 0 };
   293|   256|        weeks[ws].total++;
   294|   257|        if (rec.completed) weeks[ws].done++;
   295|   258|      });
   296|   259|
   297|   260|      return Object.values(weeks)
   298|   261|        .sort((a, b) => b.week_start.localeCompare(a.week_start))
   299|   262|        .slice(0, limit);
   300|   263|    },
   301|   264|
   302|   265|    // ==================== 焦虑量表（P1-7）====================
   303|   266|    async addAnxietySurvey({ child_id, answers, submitted_at }) {
   304|   267|      const db2 = db;
   305|   268|      // 答案需要加密（云函数中已加密传递，此处直接存储）
   306|   269|      const r = await db.collection('anxiety_surveys').add({
   307|   270|        data: {
   308|   271|          child_id,
   309|   272|          answers_enc: JSON.stringify(answers), // 简化：JSON存储，实际应加密
   310|   273|          submitted_at: submitted_at || db2.serverDate()
   311|   274|        }
   312|   275|      });
   313|   276|      return { _id: r._id, child_id, answers, submitted_at };
   314|   277|    },
   315|   278|    async getAnxietyHistory(child_id, limit = 10) {
   316|   279|      const r = await db.collection('anxiety_surveys')
   317|   280|        .where({ child_id })
   318|   281|        .orderBy('submitted_at', 'desc')
   319|   282|        .limit(limit)
   320|   283|        .get();
   321|   284|      return r.data.map(item => ({
   322|   285|        ...item,
   323|   286|        answers: JSON.parse(item.answers_enc || '[]')
   324|   287|      }));
   325|   288|    }
   326|   289|  };
   327|   290|}
   328|   291|
   329|   292|module.exports = { getDB };
   330|   293|