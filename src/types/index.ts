export type VcsType = 'git' | 'svn'

export interface User {
  id: number
  email: string
  name: string
  createdAt: Date
}

export interface Repository {
  id: number
  userId: number
  name: string
  vcsType: VcsType
  url: string
  httpUsername?: string   // HTTP 인증 username
  httpPassword?: string  // HTTP 인증 password/token (응답 시 제외, DB는 암호화 저장)
  createdAt: Date
}

// git: commit hash, svn: revision number (문자열로 통일)
export interface CommitLog {
  revision: string
  author: string
  message: string
  date: string
  changedPaths: string[]
}

export interface FileDiff {
  filePath: string
  status: 'added' | 'modified' | 'deleted'
  diff: string  // unified diff 형식
}

export interface Review {
  id: string  // MongoDB ObjectId
  repositoryId: number
  revision: string
  userId: number
  comments: ReviewComment[]
  createdAt: Date
  updatedAt: Date
}

export interface ReviewComment {
  filePath?: string  // 파일별 코멘트 시 사용 (선택)
  body: string
  createdAt: Date
}
