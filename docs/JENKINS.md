# Jenkins CI/CD 설정 가이드

## 전제 조건

- Jenkins 서버와 앱 서버가 동일한 머신 (또는 Jenkins가 앱 서버에 SSH 접근 가능)
- Node.js 20 설치
- PM2 전역 설치: `npm install -g pm2`

---

## 1. Jenkins 플러그인 설치

Jenkins 관리 > Plugins > Available plugins 에서 설치:

| 플러그인 | 용도 |
|----------|------|
| **NodeJS Plugin** | Node.js 버전 관리 |
| **GitHub Plugin** | GitHub Webhook 연동 |
| **Pipeline** | Declarative Pipeline (보통 기본 설치) |

---

## 2. NodeJS 도구 등록

Jenkins 관리 > Tools > NodeJS > Add NodeJS

| 항목 | 값 |
|------|----|
| Name | `NodeJS-20` ← Jenkinsfile의 `nodejs 'NodeJS-20'`과 일치해야 함 |
| Version | NodeJS 20.x |

---

## 3. 앱 디렉토리 준비 (서버)

```bash
# 앱 실행 디렉토리 생성
sudo mkdir -p /opt/code-reviewer
sudo mkdir -p /var/log/code-reviewer

# Jenkins가 사용하는 OS 유저(보통 jenkins)에게 권한 부여
sudo chown -R jenkins:jenkins /opt/code-reviewer
sudo chown -R jenkins:jenkins /var/log/code-reviewer

# .env.local 파일을 앱 디렉토리에 직접 배치 (빌드 서버에는 없어야 함)
sudo -u jenkins nano /opt/code-reviewer/.env.local
```

---

## 4. Pipeline Job 생성

1. Jenkins 대시보드 > New Item > **Pipeline** 선택
2. Pipeline 설정:
   - Definition: `Pipeline script from SCM`
   - SCM: `Git`
   - Repository URL: `https://github.com/HyeonGiMin/code-reviewer.git`
   - Credentials: GitHub Personal Access Token 등록 후 선택
   - Branch: `*/main`
   - Script Path: `Jenkinsfile`

---

## 5. GitHub Webhook 설정

GitHub 레포지토리 > Settings > Webhooks > Add webhook

| 항목 | 값 |
|------|----|
| Payload URL | `http://<JENKINS_HOST>:8080/github-webhook/` |
| Content type | `application/json` |
| 이벤트 | Just the push event |

> Jenkins가 외부에서 접근 불가능한 내부망이라면 webhook 대신 **Poll SCM** 사용:
> Jenkins Job > Configure > Build Triggers > Poll SCM: `H/5 * * * *` (5분마다 확인)

---

## 6. 첫 배포 (수동)

파이프라인 첫 실행 전 앱 디렉토리에서 PM2를 한 번 수동으로 시작해두면 이후 `pm2 restart`가 정상 동작합니다.

```bash
cd /opt/code-reviewer
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # 서버 재부팅 시 자동 시작 등록
```

---

## 파이프라인 흐름

```
GitHub push → Webhook → Jenkins
  ├── Checkout   소스 체크아웃
  ├── Install    npm ci
  ├── Lint       npm run lint  ← 실패 시 여기서 중단
  ├── Build      npm run build ← 실패 시 여기서 중단
  └── Deploy     (main 브랜치만)
        ├── rsync .next/ → /opt/code-reviewer/.next/
        ├── npm ci --omit=dev
        └── pm2 restart code-reviewer
```

---

## Jenkinsfile 환경변수 변경

앱 경로나 PM2 이름이 다르면 `Jenkinsfile` 상단 `environment` 블록만 수정:

```groovy
environment {
    APP_DIR  = '/opt/code-reviewer'  // 실제 앱 경로
    APP_NAME = 'code-reviewer'        // PM2 프로세스 이름
}
```
