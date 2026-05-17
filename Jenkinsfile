pipeline {
    agent any

    tools {
        // Jenkins 관리 > Tools > NodeJS 에서 설정한 이름과 일치해야 함
        nodejs 'NodeJS-20'
    }

    environment {
        APP_DIR  = '/opt/code-reviewer'   // 앱이 실제로 실행될 경로
        APP_NAME = 'code-reviewer'         // PM2 프로세스 이름
    }

    options {
        // 동일 브랜치 빌드가 겹치면 이전 빌드 취소
        disableConcurrentBuilds()
        // 빌드 히스토리 최대 10개 보관
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 15, unit: 'MINUTES')
    }

    triggers {
        // GitHub Webhook 연동 시 자동 트리거
        githubPush()
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install') {
            steps {
                sh 'npm ci'
            }
        }

        stage('Lint') {
            steps {
                sh 'npm run lint'
            }
        }

        stage('Build') {
            steps {
                // .env.local은 배포 서버에만 존재 — Jenkins 빌드 시에는 없어도 됨
                sh 'npm run build'
            }
        }

        stage('Deploy') {
            when {
                branch 'main'
            }
            steps {
                sh '''
                    # 빌드 결과물을 앱 디렉토리로 동기화
                    rsync -a --delete \
                        --exclude '.next/cache' \
                        .next/ ${APP_DIR}/.next/

                    rsync -a --delete \
                        public/ ${APP_DIR}/public/

                    cp package.json package-lock.json ecosystem.config.js ${APP_DIR}/

                    # 프로덕션 의존성만 설치
                    cd ${APP_DIR}
                    npm ci --omit=dev

                    # PM2로 재시작 (프로세스가 없으면 새로 시작)
                    pm2 restart ${APP_NAME} --update-env \
                        || pm2 start ecosystem.config.js
                    pm2 save
                '''
            }
        }
    }

    post {
        success {
            echo "✅ 배포 완료: ${env.BRANCH_NAME} @ ${env.GIT_COMMIT?.take(7)}"
        }
        failure {
            echo "❌ 빌드 실패: ${env.STAGE_NAME} 단계에서 오류 발생"
        }
        always {
            // 워크스페이스 node_modules 정리 (디스크 절약)
            sh 'rm -rf node_modules || true'
        }
    }
}
