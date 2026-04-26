import type { CommitLog, FileDiff } from '@/types'
import type { VcsAuth, VcsProvider } from './types'

interface GHFile {
  filename: string
  status: string
  patch?: string
}

interface GHCommitSummary {
  sha: string
  commit: {
    message: string
    author: { name: string; date: string }
  }
}

interface GHCommitDetail extends GHCommitSummary {
  files?: GHFile[]
}

function parseGithubUrl(url: string): { owner: string; repo: string } {
  const parsed = new URL(url)
  if (parsed.hostname !== 'github.com') {
    throw new Error('GitProvider currently only supports github.com URLs')
  }
  const parts = parsed.pathname.replace(/^\//, '').replace(/\.git$/, '').replace(/\/$/, '').split('/')
  if (parts.length < 2 || !parts[0] || !parts[1]) {
    throw new Error(`Cannot parse GitHub URL: ${url}`)
  }
  return { owner: parts[0], repo: parts[1] }
}

function buildFileDiff(file: GHFile): FileDiff {
  const status: FileDiff['status'] =
    file.status === 'added' ? 'added' :
    file.status === 'removed' ? 'deleted' :
    'modified'

  if (!file.patch) {
    return { filePath: file.filename, status, diff: '(binary or large file — no patch available)' }
  }

  const header =
    status === 'added'
      ? `--- /dev/null\n+++ b/${file.filename}`
      : status === 'deleted'
      ? `--- a/${file.filename}\n+++ /dev/null`
      : `--- a/${file.filename}\n+++ b/${file.filename}`

  return { filePath: file.filename, status, diff: `${header}\n${file.patch}` }
}

export class GitProvider implements VcsProvider {
  private owner: string
  private repo: string
  private auth?: VcsAuth

  constructor(url: string, auth?: VcsAuth) {
    const { owner, repo } = parseGithubUrl(url)
    this.owner = owner
    this.repo = repo
    this.auth = auth
  }

  private apiBase() {
    return `https://api.github.com/repos/${this.owner}/${this.repo}`
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'code-reviewer',
    }
    if (this.auth?.token) h['Authorization'] = `Bearer ${this.auth.token}`
    return h
  }

  private async fetchJson<T>(path: string): Promise<T> {
    const res = await fetch(`${this.apiBase()}${path}`, { headers: this.headers() })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`GitHub API ${res.status}: ${body.slice(0, 200)}`)
    }
    return res.json() as Promise<T>
  }

  async getLogs(limit = 30): Promise<CommitLog[]> {
    const commits = await this.fetchJson<GHCommitSummary[]>(`/commits?per_page=${limit}`)
    return commits.map((c) => ({
      revision: c.sha,
      author: c.commit.author.name,
      message: c.commit.message.trim(),
      date: c.commit.author.date,
      changedPaths: [],
    }))
  }

  async getCommit(revision: string): Promise<CommitLog | null> {
    try {
      const c = await this.fetchJson<GHCommitSummary>(`/commits/${revision}`)
      return {
        revision: c.sha,
        author: c.commit.author.name,
        message: c.commit.message.trim(),
        date: c.commit.author.date,
        changedPaths: [],
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('404')) return null
      throw e
    }
  }

  async getDiff(revision: string): Promise<FileDiff[]> {
    const c = await this.fetchJson<GHCommitDetail>(`/commits/${revision}`)
    return (c.files ?? []).map(buildFileDiff)
  }
}
