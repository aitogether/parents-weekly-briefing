const Database = require('better-sqlite3');
const path = require('path');

// 数据库文件路径
const DB_FILE = path.join(__dirname, '..', '..', 'data', 'pwb.db');

class DataRetentionDB {
  constructor() {
    this.db = new Database(DB_FILE);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  // 匿名化用户数据
  anonymizeUser(userId) {
    try {
      const user = this.db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      if (!user) return false;

      // 更新为匿名信息
      const anonymizedOpenId = `anonymized_${userId}_${Date.now()}`;
      const anonymizedNickname = '已注销用户';
      const boundTo = null;

      this.db.prepare(
        'UPDATE users SET open_id_enc = ?, nickname_enc = ?, bound_to = ? WHERE id = ?'
      ).run(anonymizedOpenId, anonymizedNickname, boundTo, userId);

      // 删除关联数据
      this.db.prepare('DELETE FROM notification_logs WHERE target_id = ?').run(userId);
      this.db.prepare('DELETE FROM medication_plans WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM med_confirmations WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM werun_data WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM daily_confirms WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM weekly_med_confirms WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM reminder_settings WHERE parent_id = ?').run(userId);
      this.db.prepare('DELETE FROM child_feedback WHERE parent_id = ? OR child_id = ?').run(userId, userId);
      this.db.prepare('DELETE FROM anxiety_surveys WHERE child_id = ?').run(userId);
      this.db.prepare('DELETE FROM safety_checklists WHERE user_id = ?').run(userId);

      return true;
    } catch (err) {
      console.error('[DB] 匿名化用户失败:', err);
      return false;
    }
  }

  // 获取所有需要匿名化的用户
  getOldUsers(days) {
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    return this.db.prepare(
      'SELECT id, created_at FROM users WHERE created_at < ?'
    ).all(thresholdDate);
  }

  // 清理用药确认记录
  cleanupMedicationConfirmations(days) {
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM med_confirmations WHERE confirmed_at < ? OR (confirmed_at IS NULL AND scheduled_time < ?)'
    ).run(thresholdDate, thresholdDate);
    return result.changes;
  }

  // 清理运动数据
  cleanupWerunData(days) {
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM werun_data WHERE created_at < ?'
    ).run(thresholdDate);
    return result.changes;
  }

  // 清理反馈记录
  cleanupFeedbackRecords(days) {
    const thresholdDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const result = this.db.prepare(
      'DELETE FROM child_feedback WHERE created_at < ?'
    ).run(thresholdDate);
    return result.changes;
  }
}

module.exports = { getDB: () => new DataRetentionDB() };