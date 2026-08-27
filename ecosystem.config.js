// PM2 配置文件 - alumni-system
module.exports = {
  apps: [
    {
      name: "alumni-system",         // PM2 应用名称
      script: "node",                // 使用 node 运行
      args: ".next/standalone/server.js", // standalone 模式入口
      cwd: "./",                     // 工作目录（项目根目录）
      instances: 1,                  // 实例数量（可改为 "max" 使用所有 CPU 核心）
      exec_mode: "fork",             // 执行模式（standalone 推荐 fork）
      watch: false,                  // 生产环境不开启文件监听
      max_memory_restart: "512M",    // 内存超过 512MB 自动重启

      // 环境变量 - 生产环境
      env_production: {
        NODE_ENV: "production",
        PORT: 8085,                  // 监听端口
        HOSTNAME: "0.0.0.0",         // 监听所有网卡
      },

      // 环境变量 - 开发环境（可选）
      env_development: {
        NODE_ENV: "development",
        PORT: 8085,
      },

      // 日志配置
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      out_file: "./logs/pm2-out.log",   // 标准输出日志
      error_file: "./logs/pm2-err.log", // 错误日志
      merge_logs: true,

      // 崩溃自动重启策略
      autorestart: true,
      restart_delay: 3000,           // 重启前等待 3 秒
      max_restarts: 10,              // 最大重启次数
      min_uptime: "10s",             // 运行超过 10s 才认为启动成功
    },
  ],
};
