import type { CommitLog, FileDiff } from '@/types'

export interface VcsAuth {
  username?: string
  token?: string
}

export interface VcsProvider {
  getLogs(limit?: number): Promise<CommitLog[]>
  getCommit(revision: string): Promise<CommitLog | null>
  getDiff(revision: string): Promise<FileDiff[]>
}
