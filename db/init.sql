-- 사용자
CREATE TABLE IF NOT EXISTS users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) UNIQUE NOT NULL,
  name       VARCHAR(255) NOT NULL,
  password   VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 레포지토리 (사용자별 Git/SVN 설정)
-- http_username / http_token: HTTP Basic 인증용 (GitHub PAT, GitLab token 등)
CREATE TABLE IF NOT EXISTS repositories (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name          VARCHAR(255) NOT NULL,
  vcs_type      VARCHAR(10) NOT NULL CHECK (vcs_type IN ('git', 'svn')),
  url           TEXT NOT NULL,
  http_username VARCHAR(255),          -- HTTP 인증 username (선택)
  http_password TEXT,                  -- HTTP 인증 password/token (AES-256-GCM 암호화 저장)
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
