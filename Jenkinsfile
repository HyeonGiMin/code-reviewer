pipeline {
    agent any

    tools {
        nodejs "22.14.0"
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
                    echo 'Preparing standalone build...'

                    // standalone 실행에 필요한 파일 복사
                    sh 'cp -r public .next/standalone/ || true'
                    sh 'cp -r .next/static .next/standalone/.next/ || true'

                    // .env.local을 standalone 폴더에 복사 (Next.js는 .env.local 우선 적용)
                    sh 'cp .env.local .next/standalone/ || true'
                    sh 'cp .env.local .next/standalone/.env.production || true'

                    echo 'Starting application with PM2...'
                    sh 'pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js'
                    sh 'pm2 save'
                }
            }
        }
    }

    post {
        success {
            echo 'Deployment successful!'
        }
        failure {
            echo 'Build failed. Check the logs above.'
        }
    }
}
