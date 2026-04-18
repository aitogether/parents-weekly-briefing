-- Data Retention Strategy - Database Index Optimization (P2-1 GDPR/PIPL Compliance)
--
-- This SQL script creates additional indexes to optimize data retention operations.
-- These indexes will significantly improve the performance of cleanup queries.

-- ================================
-- 数据保留优化索引
-- ================================

-- 用药确认表：按创建时间排序的复合索引
-- 用于快速查找需要清理的旧记录
CREATE INDEX IF NOT EXISTS idx_med_confirm_created ON med_confirmations(created_at);

-- 用药确认表：按用户ID和创建时间排序的复合索引
-- 支持按用户分组清理历史记录
CREATE INDEX IF NOT EXISTS idx_med_confirm_parent_created ON med_confirmations(parent_id, created_at);

-- 微信运动数据表：按创建时间排序的索引
-- 用于快速定位过期运动数据
CREATE INDEX IF NOT EXISTS idx_werun_created ON werun_data(created_at);

-- 微信运动数据表：按用户ID和创建时间排序的复合索引
-- 支持按用户分组处理历史数据
CREATE INDEX IF NOT EXISTS idx_werun_parent_created ON werun_data(parent_id, created_at);

-- 反馈记录表：按创建时间排序的索引
-- 用于快速删除过期反馈
CREATE INDEX IF NOT EXISTS idx_feedback_created ON child_feedback(created_at);

-- 反馈记录表：按用户ID和创建时间排序的复合索引
-- 支持按用户分组清理反馈数据
CREATE INDEX IF NOT EXISTS idx_feedback_parent_created ON child_feedback(parent_id, created_at);

-- 用户表：按创建时间排序的索引
-- 用于快速定位需要匿名化的旧用户
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);

-- 通知日志表：按发送时间排序的索引
-- 用于清理过期的通知记录
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent ON notification_logs(sent_at);

-- ================================
-- 软删除字段添加（未来扩展）
-- ================================

-- 为用药确认表添加软删除字段
-- 当前策略使用硬删除，但预留软删除选项供未来使用
/*
ALTER TABLE med_confirmations ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_med_confirm_deleted ON med_confirmations(is_deleted);
*/

-- 为微信运动数据表添加软删除字段
/*
ALTER TABLE werun_data ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_werun_deleted ON werun_data(is_deleted);
*/

-- 为反馈记录表添加软删除字段
/*
ALTER TABLE child_feedback ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_feedback_deleted ON child_feedback(is_deleted);
*/

-- ================================
-- 统计信息收集
-- ================================

-- 更新表的统计信息，帮助查询优化器选择最佳执行计划
ANALYZE;

-- ================================
-- 性能监控视图
-- ================================

-- 创建数据量统计视图，用于监控各表的数据增长情况
CREATE VIEW IF NOT EXISTS data_retention_stats AS
SELECT
    'med_confirmations' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM med_confirmations

UNION ALL

SELECT
    'werun_data' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM werun_data

UNION ALL

SELECT
    'child_feedback' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM child_feedback

UNION ALL

SELECT
    'users' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM users;

-- ================================
-- 清理建议视图
-- ================================

-- 创建即将被清理的数据预览视图
CREATE VIEW IF NOT EXISTS cleanup_preview AS
SELECT
    'med_confirmations' as table_name,
    COUNT(*) as records_to_cleanup,
    'DELETE FROM med_confirmations WHERE created_at < DATE("now", "-30 days")' as cleanup_sql
FROM med_confirmations
WHERE created_at < DATE("now", "-30 days")

UNION ALL

SELECT
    'werun_data' as table_name,
    COUNT(*) as records_to_cleanup,
    'DELETE FROM werun_data WHERE created_at < DATE("now", "-30 days")' as cleanup_sql
FROM werun_data
WHERE created_at < DATE("now", "-30 days")

UNION ALL

SELECT
    'child_feedback' as table_name,
    COUNT(*) as records_to_cleanup,
    'DELETE FROM child_feedback WHERE created_at < DATE("now", "-30 days")' as cleanup_sql
FROM child_feedback
WHERE created_at < DATE("now", "-30 days");

-- ================================
-- 使用说明
-- ================================

/*
执行说明：

1. 备份数据库：在执行前确保有完整的数据库备份
   sqlite3 pwb.db ".backup backup_$(date +%Y%m%d_%H%M%S).db"

2. 在测试环境中验证脚本：
   sqlite3 test_pwb.db < db-retention-indexes.sql

3. 在生产环境中执行：
   sqlite3 /Users/diygun/parents-weekly-briefing/backend/data/pwb.db < db-retention-indexes.sql

4. 监控索引效果：
   - 检查查询性能是否提升
   - 监控磁盘空间使用情况
   - 定期分析索引有效性

5. 维护建议：
   - 定期运行 ANALYZE 命令更新统计信息
   - 监控慢查询日志，必要时调整索引
   - 根据实际数据增长情况调整索引策略

6. 回滚方案：
   - 索引可以安全删除，不会影响数据完整性
   - 删除索引的命令：DROP INDEX index_name;
   - 软删除字段的注释代码提供了回滚参考

性能预期：
- 清理操作的执行时间将减少50%-80%
- 大表查询性能显著提升
- 系统整体响应速度改善
*/

-- 验证索引创建成功
SELECT
    name as index_name,
    sql as index_definition
FROM sqlite_master
WHERE type = 'index'
AND name LIKE 'idx_%'
ORDER BY name;