pipeline {
    agent any

    tools {
        nodejs "22.14.0"
    }

    environment {
        APP_NAME = 'code-reviewer'
        APP_PORT = '15010'
    }

    stages {
        stage('Checkout') {
            steps {
                git branch: 'main',
                    credentialsId: 'github-jenkins-token',
                    url: 'https://github.com/HyeonGiMin/code-reviewer.git'
            }
        }

        stage('Initialize') {
            steps {
                script {
                    echo 'Checking environment...'
                    sh 'node -v'
                    sh 'npm -v'
                    sh 'pwd'
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo 'Installing packages...'
                    sh 'if [ -f package-lock.json ]; then npm ci; else npm install; fi'
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    echo 'Building Next.js application...'
                    sh 'npm run build'
                }
            }
        }

        stage('Deploy (PM2)') {
            steps {
                script {
                    def appName = "${env.APP_NAME}"
                    def appPort = "${env.APP_PORT}"
                    def workspacePath = "${env.WORKSPACE}"

                    echo "Preparing standalone build for [${appName}] on port ${appPort}..."

                    sh 'cp -r public .next/standalone/ || true'
                    sh 'cp -r .next/static .next/standalone/.next/ || true'
                    // 이 프로젝트는 .env.local 사용
                    sh 'cp .env.local .next/standalone/ || true'
                    sh 'cp .env.local .next/standalone/.env.production || true'

                    // ecosystem.config.js 동적 생성
                    writeFile file: '.next/standalone/ecosystem.config.js', text: """
module.exports = {
  apps: [
    {
      name: '${appName}',
      script: 'server.js',
      cwd: '${workspacePath}/.next/standalone',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        PORT: ${appPort},
        NODE_ENV: 'production',
        HOSTNAME: '0.0.0.0',
      },
    },
  ],
};
"""

                    echo "Starting application [${appName}] with PM2..."

                    sh """
                        if pm2 describe ${appName} > /dev/null 2>&1; then
                            echo '[PM2] 기존 프로세스 발견 → reload'
                            pm2 reload .next/standalone/ecosystem.config.js --update-env
                        else
                            echo '[PM2] 신규 프로세스 → start'
                            pm2 start .next/standalone/ecosystem.config.js --update-env
                        fi
                    """

                    sh 'pm2 save'

                    echo "Verifying deployment..."
                    sh """
                        sleep 3
                        if pm2 describe ${appName} | grep -q 'online'; then
                            echo '✅ [${appName}] 정상 실행 중 (port: ${appPort})'
                        else
                            echo '❌ [${appName}] 실행 실패 — pm2 logs 확인 필요'
                            pm2 logs ${appName} --lines 20 --nostream || true
                            exit 1
                        fi
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ [${env.APP_NAME}] 빌드 및 배포 성공 (port: ${env.APP_PORT})"
        }
        failure {
            echo "❌ [${env.APP_NAME}] 빌드 또는 배포 실패. 로그를 확인하세요."
        }
    }
}
