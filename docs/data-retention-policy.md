# 数据保留策略文档 (Data Retention Policy)

## 概述

本项目实现了符合GDPR（通用数据保护条例）和PIPL（个人信息保护法）要求的数据保留策略。该策略确保用户数据的合理存储期限，并在达到保留期限后自动清理或匿名化相关数据。

## 策略目标

1. **合规性**：符合GDPR/PIPL关于个人数据保留期限的要求
2. **数据最小化**：仅保留必要的数据，及时清理过期数据
3. **安全性**：确保敏感数据得到适当处理
4. **可追溯性**：完整的审计日志记录所有数据操作

## 数据分类与保留策略

### 1. 用药确认记录 (Medication Confirmations)
- **保留期限**：30天
- **清理策略**：自动删除超过30天的未确认用药记录
- **业务影响**：不影响当前用药计划的执行，仅清理历史确认记录

### 2. 运动步数记录 (Werun Data)
- **保留期限**：30天
- **清理策略**：自动删除超过30天的运动数据
- **业务影响**：不影响当前健康监测功能，历史数据可重新录入

### 3. 反馈记录 (Feedback Records)
- **保留期限**：30天
- **清理策略**：自动删除超过30天的子女反馈记录
- **业务影响**：不影响当前的亲子互动功能

### 4. 用户数据 (User Data)
- **保留期限**：90天
- **处理策略**：匿名化处理（保留open_id用于关联分析，清除PII信息）
- **业务影响**：用户身份信息被匿名化，但仍可用于统计分析

## 技术实现

### 数据库优化

#### 索引优化
为提升查询性能，已在以下字段创建索引：

```sql
-- 用药确认表索引
CREATE INDEX IF NOT EXISTS idx_med_confirm_created ON med_confirmations(created_at);
CREATE INDEX IF NOT EXISTS idx_med_confirm_parent_created ON med_confirmations(parent_id, created_at);

-- 微信运动数据索引
CREATE INDEX IF NOT EXISTS idx_werun_created ON werun_data(created_at);
CREATE INDEX IF NOT EXISTS idx_werun_parent_created ON werun_data(parent_id, created_at);

-- 反馈记录索引
CREATE INDEX IF NOT EXISTS idx_feedback_created ON child_feedback(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_parent_created ON child_feedback(parent_id, created_at);
```

#### 软删除字段
考虑未来扩展，已准备软删除机制：

```sql
ALTER TABLE med_confirmations ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
ALTER TABLE werun_data ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
ALTER TABLE child_feedback ADD COLUMN is_deleted BOOLEAN DEFAULT 0;
```

## 脚本说明

### data-retention.js

主要执行脚本，包含以下功能：

1. **初始化**：建立数据库连接
2. **清理用药确认记录**：删除超过30天的记录
3. **清理运动数据**：删除超过30天的运动记录
4. **清理反馈记录**：删除超过30天的反馈记录
5. **用户匿名化**：匿名化超过90天的用户数据
6. **审计日志**：详细记录所有操作
7. **统计报告**：生成执行结果报告

### 运行参数

- `--dry-run` 或 `-d`：试运行模式，不实际修改数据
- 无参数：生产模式，执行实际清理操作

### cron配置

每日凌晨3点自动执行：
```
0 3 * * * cd /Users/diygun/parents-weekly-briefing/backend && node scripts/data-retention.js >> logs/data-retention-cron.log 2>&1
```

## 安全考虑

### 1. 权限控制
- 所有删除操作都需要数据库写权限
- 审计日志需要写入权限
- 建议在受控环境中运行

### 2. 数据备份
- 执行前确保有完整的数据库备份
- 建议定期备份audit log文件
- 重要操作前手动确认

### 3. 监控机制
- 定期检查data-retention-audit.log
- 监控cron日志中的错误信息
- 设置异常情况下的告警机制

## 测试流程

### 1. 单元测试
```bash
cd /Users/diygun/parents-weekly-briefing/backend
node scripts/data-retention.js --dry-run
```

### 2. 集成测试
- 在测试环境中验证完整流程
- 检查审计日志是否正确记录
- 验证统计数据是否准确

### 3. 生产部署
1. 在测试环境充分验证
2. 备份生产数据库
3. 分阶段部署（先试运行，再正式启用）
4. 持续监控运行状态

## 故障恢复

### 1. 数据恢复
- 依赖定期数据库备份
- 使用数据库的binlog进行时间点恢复

### 2. 日志恢复
- audit log文件作为操作证据
- 可用于追踪任何意外的数据删除

### 3. 应急措施
- 发现误删时立即停止定时任务
- 从备份恢复受影响的数据
- 分析原因并改进防护措施

## 合规性声明

本数据保留策略设计遵循以下法规要求：

### GDPR 第5条 - 数据处理原则
- **合法、公正、透明**：明确告知用户数据保留政策
- **目的限制**：数据仅用于指定目的
- **数据最小化**：只收集和处理必要的个人数据
- **准确性**：确保数据的准确性和及时更新
- **存储限制**：不超过实现目的所需的时间
- **完整性和保密性**：采取适当的技术和组织措施保护数据

### PIPL 相关规定
- 个人信息保存期限应为实现处理目的所必需的最短时间
- 在保存期限届满后，应及时删除或匿名化处理个人信息
- 提供用户访问、更正、删除个人信息的权利

## 版本历史

- v1.0 (2024-04-18)：初始版本，实现基本的数据保留策略
- 后续版本将根据实际使用情况和法规变化进行更新

## 维护联系

如有问题或需要调整策略，请联系系统管理员或开发团队。