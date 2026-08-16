module.exports = {
  apps: [
    {
      name: "stock-app",
      cwd: "/home/application/management-stock/frontend",
      script: "/home/application/management-stock/frontend/node_modules/next/dist/bin/next",
      args: "start -p 3000 -H 127.0.0.1",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "500M",
      exp_backoff_restart_delay: 1000,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}
