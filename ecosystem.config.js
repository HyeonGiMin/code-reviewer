/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'code-reviewer',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/opt/code-reviewer',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      // 메모리 500MB 초과 시 자동 재시작
      max_memory_restart: '500M',
      // 로그 경로
      out_file: '/var/log/code-reviewer/out.log',
      error_file: '/var/log/code-reviewer/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
