/**
 * 数据保留策略执行脚本（P2-1 GDPR/PIPL 合规）
 *
 * 功能：
 * - 清理超过30天的未确认用药记录
 * - 清理超过30天的运动步数记录
 * - 清理超过30天的反馈记录
 * - 匿名化超过90天的用户数据（保留open_id用于关联）
 * - 提供dry-run模式用于测试
 * - 详细的审计日志记录
 *
 * 使用方法：
 * node scripts/data-retention.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');

// 数据库模块
const Database = require('better-sqlite3');
const DB_FILE = path.join(__dirname, '..', '..', 'data', 'pwb.db');

// 配置参数
const RETENTION_CONFIG = {
  // 删除策略（超过N天的数据将被删除）
  DELETE_AFTER_DAYS: {
    medication_confirmations: 30,     // 未确认的用药记录
    werun_data: 30,                   // 运动步数记录
    feedback_records: 30,             // 反馈记录
  },
  // 匿名化策略（超过N天的用户数据将被匿名化）
  ANONYMIZE_AFTER_DAYS: {
    users: 90,                        // 用户基本信息
  },
  // 日志配置
  LOG_DIR: path.join(__dirname, '..', 'logs'),
  AUDIT_LOG_FILE: 'data-retention-audit.log',
};

class DataRetentionManager {
  constructor(dryRun = false) {
    this.db = new Database(DB_FILE);
    this.dryRun = dryRun;
    this.auditLog = [];
    this.stats = {
      deleted_medication: 0,
      deleted_werun: 0,
      deleted_feedback: 0,
      anonymized_users: 0,
      total_processed: 0,
    };

    // 确保日志目录存在
    if (!this.dryRun && !fs.existsSync(RETENTION_CONFIG.LOG_DIR)) {
      fs.mkdirSync(RETENTION_CONFIG.LOG_DIR, { recursive: true });
    }
  }

  /**
   * 记录审计日志
   */
  logAudit(action, details, count = 0) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      details,
      count,
      dryRun: this.dryRun,
    };

    this.auditLog.push(logEntry);

    // 写入文件日志
    if (!this.dryRun) {
      const logPath = path.join(RETENTION_CONFIG.LOG_DIR, RETENTION_CONFIG.AUDIT_LOG_FILE);
      const logLine = `${timestamp} | ${action} | ${JSON.stringify(details)} | count=${count} | dry_run=${this.dryRun}\n`;
      fs.appendFileSync(logPath, logLine);
    }

    console.log(`[${timestamp}] ${action}: ${details} (${count} items)`);
  }

  /**
   * 获取日期阈值
   */
  getDateThreshold(days) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  }

  /**
   * 清理超过阈值的用药确认记录
   */
  async cleanupMedicationConfirmations() {
    const thresholdDate = this.getDateThreshold(RETENTION_CONFIG.DELETE_AFTER_DAYS.medication_confirmations);
    const cutoffDate = thresholdDate.slice(0, 10); // YYYY-MM-DD格式

    try {
      // 先查询符合条件的记录数量
      const countQuery = `
        SELECT COUNT(*) as count FROM med_confirmations
        WHERE confirmed_at < ? OR (confirmed_at IS NULL AND scheduled_time < ?)
      `;

      const rows = this.db.prepare(countQuery).all(thresholdDate, thresholdDate);
      const count = rows[0].count;

      if (count === 0) {
        this.logAudit('medication_cleanup_check', `No records older than ${thresholdDate}`, 0);
        return;
      }

      if (this.dryRun) {
        this.logAudit('medication_cleanup_dry_run', `Would delete ${count} medication confirmation records older than ${cutoffDate}`, count);
        this.stats.deleted_medication = count;
        return;
      }

      // 执行删除操作
      const deleteStmt = this.db.prepare(`
        DELETE FROM med_confirmations
        WHERE confirmed_at < ? OR (confirmed_at IS NULL AND scheduled_time < ?)
      `);

      const result = deleteStmt.run(thresholdDate, thresholdDate);
      this.stats.deleted_medication = result.changes;

      this.logAudit('medication_cleanup_executed', `Deleted ${result.changes} medication confirmation records`, result.changes);
    } catch (error) {
      this.logAudit('medication_cleanup_error', `Error during cleanup: ${error.message}`, 0);
      console.error('用药记录清理失败:', error);
    }
  }

  /**
   * 清理超过阈值的微信运动数据
   */
  async cleanupWerunData() {
    const thresholdDate = this.getDateThreshold(RETENTION_CONFIG.DELETE_AFTER_DAYS.werun_data);

    try {
      // 查询符合条件的记录数量
      const countQuery = `
        SELECT COUNT(*) as count FROM werun_data
        WHERE created_at < ?
      `;

      const rows = this.db.prepare(countQuery).all(thresholdDate);
      const count = rows[0].count;

      if (count === 0) {
        this.logAudit('werun_cleanup_check', `No records older than ${thresholdDate}`, 0);
        return;
      }

      if (this.dryRun) {
        this.logAudit('werun_cleanup_dry_run', `Would delete ${count} werun data records older than ${thresholdDate}`, count);
        this.stats.deleted_werun = count;
        return;
      }

      // 执行删除操作
      const deleteStmt = this.db.prepare(`
        DELETE FROM werun_data
        WHERE created_at < ?
      `);

      const result = deleteStmt.run(thresholdDate);
      this.stats.deleted_werun = result.changes;

      this.logAudit('werun_cleanup_executed', `Deleted ${result.changes} werun data records`, result.changes);
    } catch (error) {
      this.logAudit('werun_cleanup_error', `Error during cleanup: ${error.message}`, 0);
      console.error('运动数据清理失败:', error);
    }
  }

  /**
   * 清理超过阈值的反馈记录
   */
  async cleanupFeedbackRecords() {
    const thresholdDate = this.getDateThreshold(RETENTION_CONFIG.DELETE_AFTER_DAYS.feedback_records);

    try {
      // 查询符合条件的记录数量
      const countQuery = `
        SELECT COUNT(*) as count FROM child_feedback
        WHERE created_at < ?
      `;

      const rows = this.db.prepare(countQuery).all(thresholdDate);
      const count = rows[0].count;

      if (count === 0) {
        this.logAudit('feedback_cleanup_check', `No records older than ${thresholdDate}`, 0);
        return;
      }

      if (this.dryRun) {
        this.logAudit('feedback_cleanup_dry_run', `Would delete ${count} feedback records older than ${thresholdDate}`, count);
        this.stats.deleted_feedback = count;
        return;
      }

      // 执行删除操作
      const deleteStmt = this.db.prepare(`
        DELETE FROM child_feedback
        WHERE created_at < ?
      `);

      const result = deleteStmt.run(thresholdDate);
      this.stats.deleted_feedback = result.changes;

      this.logAudit('feedback_cleanup_executed', `Deleted ${result.changes} feedback records`, result.changes);
    } catch (error) {
      this.logAudit('feedback_cleanup_error', `Error during cleanup: ${error.message}`, 0);
      console.error('反馈记录清理失败:', error);
    }
  }

  /**
   * 匿名化超过阈值的用户数据
   */
  async anonymizeOldUsers() {
    const thresholdDate = this.getDateThreshold(RETENTION_CONFIG.ANONYMIZE_AFTER_DAYS.users);

    try {
      // 查询需要匿名化的用户
      const usersQuery = `
        SELECT id, created_at FROM users
        WHERE created_at < ?
      `;

      const oldUsers = this.db.prepare(usersQuery).all(thresholdDate);
      const count = oldUsers.length;

      if (count === 0) {
        this.logAudit('user_anonymization_check', `No users older than ${thresholdDate}`, 0);
        return;
      }

      this.logAudit('user_anonymization_start', `Found ${count} users to anonymize`, count);

      let successCount = 0;
      for (const user of oldUsers) {
        if (this.dryRun) {
          successCount++;
          continue;
        }

        try {
          // 匿名化处理
          const anonymizedOpenId = `anonymized_${user.id}_${Date.now()}`;
          const anonymizedNickname = '已注销用户';
          const boundTo = null;

          this.db.prepare(
            'UPDATE users SET open_id_enc = ?, nickname_enc = ?, bound_to = ? WHERE id = ?'
          ).run(anonymizedOpenId, anonymizedNickname, boundTo, user.id);

          // 删除关联数据
          this.db.prepare('DELETE FROM notification_logs WHERE target_id = ?').run(user.id);
          this.db.prepare('DELETE FROM medication_plans WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM med_confirmations WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM werun_data WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM daily_confirms WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM weekly_med_confirms WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM reminder_settings WHERE parent_id = ?').run(user.id);
          this.db.prepare('DELETE FROM child_feedback WHERE parent_id = ? OR child_id = ?').run(user.id, user.id);
          this.db.prepare('DELETE FROM anxiety_surveys WHERE child_id = ?').run(user.id);
          this.db.prepare('DELETE FROM safety_checklists WHERE user_id = ?').run(user.id);

          successCount++;
        } catch (error) {
          this.logAudit('user_anonymization_error', `Failed to anonymize user ${user.id}: ${error.message}`, 0);
        }
      }

      if (this.dryRun) {
        this.stats.anonymized_users = count;
        this.logAudit('user_anonymization_dry_run', `Would anonymize ${count} users`, count);
      } else {
        this.stats.anonymized_users = successCount;
        this.logAudit('user_anonymization_completed', `Successfully anonymized ${successCount}/${count} users`, successCount);
      }
    } catch (error) {
      this.logAudit('user_anonymization_error', `Error during anonymization: ${error.message}`, 0);
      console.error('用户匿名化失败:', error);
    }
  }

  /**
   * 生成统计报告
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      dryRun: this.dryRun,
      summary: this.stats,
      auditLog: this.auditLog,
    };

    console.log('\n=== 数据保留策略执行报告 ===');
    console.log(`执行时间: ${report.timestamp}`);
    console.log(`运行模式: ${this.dryRun ? 'DRY RUN' : 'PRODUCTION'}`);
    console.log('\n统计信息:');
    console.log(`- 删除的用药确认记录: ${this.stats.deleted_medication}`);
    console.log(`- 删除的运动数据记录: ${this.stats.deleted_werun}`);
    console.log(`- 删除的反馈记录: ${this.stats.deleted_feedback}`);
    console.log(`- 匿名化的用户: ${this.stats.anonymized_users}`);
    console.log(`- 总计处理: ${this.stats.total_processed}`);

    if (this.dryRun) {
      console.log('\n⚠️  这是DRY RUN模式，不会实际修改数据。');
    }

    return report;
  }

  /**
   * 执行完整的数据保留策略
   */
  async execute() {
    console.log(`[DataRetention] 开始数据保留策略执行 (${this.dryRun ? 'DRY RUN' : 'PRODUCTION'})`);

    try {
      // 按顺序执行各项清理任务
      await this.cleanupMedicationConfirmations();
      await this.cleanupWerunData();
      await this.cleanupFeedbackRecords();
      await this.anonymizeOldUsers();

      // 生成最终报告
      this.generateReport();

      console.log('[DataRetention] 数据保留策略执行完成');
      return this.stats;
    } catch (error) {
      console.error('[DataRetention] 执行失败:', error);
      throw error;
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');

  const manager = new DataRetentionManager(dryRun);
  await manager.execute();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('数据保留策略执行失败:', error);
    process.exit(1);
  });
}

module.exports = { DataRetentionManager, main };