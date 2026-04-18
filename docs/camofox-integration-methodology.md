
关键方法论：Hermes 外部服务集成模式
=====================================

1. 三层分离架构
   - 服务层：独立进程（REST API 或 CLI）
   - 配置层：环境变量在 ~/.hermes/.env
   - 集成层：tools/<service>_backend.py 实现 is_<service>_mode()

2. 环境变量加载陷阱
   - load_env() 只读不写（返回字典）
   - reload_env() 才更新 os.environ
   - 修改 .env 后必须重载或重启

3. 验证顺序
   服务健康 → 环境变量 → 检测函数 → 工具调用

4. 命名不一致的应对
   - 包名 ≠ 命令名：用 npm search 而非 npm view
   - 用 which 确认可执行文件位置
   - 用 --help 确认命令结构

5. 系统服务独立
   - Hermes 不管理外部服务生命周期
   - 需手动配置 launchd/systemd
   - 日志分离：/tmp/<service>.out

这个模式适用于任何 REST API 服务集成到 Hermes。
