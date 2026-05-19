/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'code-reviewer',
      // standalone 빌드는 next start 대신 server.js 직접 실행
      script: '.next/standalone/server.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      max_memory_restart: '500M',
      out_file: '/var/log/code-reviewer/out.log',
      error_file: '/var/log/code-reviewer/error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
}
