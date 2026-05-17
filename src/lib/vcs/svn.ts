import { parseStringPromise } from 'xml2js'
import * as Diff from 'diff'
import type { CommitLog, FileDiff } from '@/types'
import type { VcsAuth, VcsProvider } from './types'

interface SvnLogEntry {
  revision: string
  author: string
  message: string
  date: string
  changedPaths: Array<{ path: string; action: string }>
}

export class SvnProvider implements VcsProvider {
  private url: string
  private auth?: VcsAuth
  private repoRoot?: string  // SVN-Repository-Root (repo root, not registered URL)

  constructor(url: string, auth?: VcsAuth) {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('SVN은 http:// 또는 https:// URL만 지원합니다. (svn:// 불가)')
    }
    this.url = url.replace(/\/$/, '')
    this.auth = auth
  }

  private baseHeaders(): Record<string, string> {
    const h: Record<string, string> = {}
    if (this.auth?.username && this.auth?.token) {
      const b64 = Buffer.from(`${this.auth.username}:${this.auth.token}`).toString('base64')
      h['Authorization'] = `Basic ${b64}`
    }
    return h
  }

  // repo root 확보 (한 번만 실행): OPTIONS 헤더 → PROPFIND VCC href → fallback
  private async ensureRepoRoot(): Promise<void> {
    if (this.repoRoot) return

    // 1) OPTIONS: SVN-Repository-Root 헤더
    try {
      const res = await fetch(`${this.url}/`, {
        method: 'OPTIONS',
        cache: 'no-store',
        headers: this.baseHeaders(),
      })
      const root = res.headers.get('SVN-Repository-Root')
      if (root) {
        this.repoRoot = root.replace(/\/$/, '')
        return
      }
    } catch { /* ignore */ }

    // 2) PROPFIND: version-controlled-configuration href에서 추출
    // VCC href 형식: /svn/paean/!svn/vcc/default  또는  http://host/svn/paean/!svn/vcc/default
    try {
      const res = await fetch(`${this.url}/`, {
        method: 'PROPFIND',
        cache: 'no-store',
        headers: { ...this.baseHeaders(), 'Content-Type': 'text/xml', Depth: '0' },
        body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:version-controlled-configuration/></D:prop>
</D:propfind>`,
      })
      if (res.ok) {
        const xml = await res.text()
        const match = xml.match(/href[^>]*>([^<]+\/!svn\/vcc\/default)<\//)
        if (match) {
          const vccHref = match[1].trim()
          const repoPath = vccHref.replace(/\/!svn\/vcc\/default$/, '')
          this.repoRoot = repoPath.startsWith('http')
            ? repoPath.replace(/\/$/, '')
            : new URL(this.url).origin + repoPath
          return
        }
      }
    } catch { /* ignore */ }

    // 3) fallback
    this.repoRoot = this.url
  }

  // PROPFIND로 HEAD 리비전 조회 (참조 코드와 동일한 방식)
  private async getHeadRevision(): Promise<number> {
    const repoUrl = `${this.url}/`
    const res = await fetch(repoUrl, {
      method: 'PROPFIND',
      cache: 'no-store',
      headers: { ...this.baseHeaders(), 'Content-Type': 'text/xml', Depth: '0' },
      body: `<?xml version="1.0" encoding="utf-8"?>
<D:propfind xmlns:D="DAV:">
  <D:prop><D:version-name/></D:prop>
</D:propfind>`,
    })
    if (!res.ok) throw new Error(`SVN PROPFIND 실패 (${res.status})`)

    const xml = await res.text()
    const parsed = await parseStringPromise(xml) as Record<string, unknown>

    const multistatus = (parsed['D:multistatus'] ?? parsed['multistatus']) as Record<string, unknown> | undefined
    if (multistatus) {
      const responses = (multistatus['D:response'] ?? multistatus['response']) as unknown[]
      const resp = responses?.[0] as Record<string, unknown>
      if (resp) {
        const prop = getSuccessfulProp(resp)
        if (prop) {
          const rev = findProp(prop, 'version-name')
          if (rev) return parseInt(rev, 10)
        }
      }
    }
    throw new Error('SVN HEAD 리비전을 확인할 수 없습니다')
  }

  private async reportLog(headRev: number, endRev: number, limit?: number): Promise<SvnLogEntry[]> {
    const repoUrl = `${this.url}/`
    const limitXml = limit != null ? `  <S:limit>${limit}</S:limit>\n` : ''
    const body = `<?xml version="1.0" encoding="utf-8"?>
<S:log-report xmlns:S="svn:">
  <S:start-revision>${headRev}</S:start-revision>
  <S:end-revision>${endRev}</S:end-revision>
${limitXml}  <S:path></S:path>
  <S:discover-changed-paths/>
</S:log-report>`

    const res = await fetch(repoUrl, {
      method: 'REPORT',
      cache: 'no-store',
      headers: { ...this.baseHeaders(), 'Content-Type': 'text/xml', Depth: '1' },
      body,
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`SVN REPORT 실패 (${res.status}): ${text.slice(0, 200)}`)
    }

    return parseLogReport(await res.text())
  }

  async getLogs(limit = 30): Promise<CommitLog[]> {
    const head = await this.getHeadRevision()
    const entries = await this.reportLog(head, 1, limit)
    return entries.map(entryToCommitLog)
  }

  async getCommit(revision: string): Promise<CommitLog | null> {
    if (!/^\d+$/.test(revision)) return null
    const rev = parseInt(revision, 10)
    const entries = await this.reportLog(rev, rev)
    return entries[0] ? entryToCommitLog(entries[0]) : null
  }

  async getDiff(revision: string): Promise<FileDiff[]> {
    if (!/^\d+$/.test(revision)) throw new Error(`유효하지 않은 SVN 리비전: ${revision}`)
    const rev = parseInt(revision, 10)
    const prev = rev - 1

    await this.ensureRepoRoot()
    const entries = await this.reportLog(rev, rev)
    const entry = entries[0]
    if (!entry) throw new Error(`리비전을 찾을 수 없습니다: ${revision}`)

    const results: FileDiff[] = []
    for (const { path, action } of entry.changedPaths) {
      const isAdded = action === 'A'
      const isDeleted = action === 'D'

      const [oldContent, newContent] = await Promise.all([
        isAdded ? Promise.resolve(null) : this.fetchFileAt(path, prev),
        isDeleted ? Promise.resolve(null) : this.fetchFileAt(path, rev),
      ])

      // 디렉토리 경로이거나 바이너리 파일인 경우 양쪽 다 null → 스킵
      if (oldContent === null && newContent === null) continue

      const status: FileDiff['status'] = isAdded ? 'added' : isDeleted ? 'deleted' : 'modified'
      results.push({ filePath: path, status, diff: buildUnifiedDiff(path, oldContent ?? '', newContent ?? '', status) })
    }

    return results
  }

  private async fetchFileAt(path: string, revision: number): Promise<string | null> {
    const base = this.repoRoot ?? this.url
    const filePath = path.startsWith('/') ? path : '/' + path
    const url = `${base}/!svn/bc/${revision}${filePath}`
    try {
      const res = await fetch(url, { cache: 'no-store', headers: this.baseHeaders() })
      if (!res.ok) return null
      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('text/html')) return null
      return res.text()
    } catch {
      return null
    }
  }
}

// --- XML 파싱 헬퍼 (참조 코드 기반) ---

// D:, lp1:, S: 등 네임스페이스 프리픽스 관계없이 suffix로 값 찾기
function findProp(prop: Record<string, unknown>, suffix: string): string | undefined {
  const key = Object.keys(prop).find((k) => k === suffix || k.endsWith(':' + suffix))
  if (!key) return undefined
  const val = (prop[key] as unknown[])?.[0]
  return typeof val === 'string' ? val : undefined
}

// PROPFIND 응답에서 200 OK인 propstat의 prop 반환
function getSuccessfulProp(resp: Record<string, unknown>): Record<string, unknown> | null {
  const propstats = (resp['D:propstat'] ?? resp['propstat']) as unknown[]
  if (!propstats) return null
  const list = Array.isArray(propstats) ? propstats : [propstats]
  for (const ps of list as Record<string, unknown>[]) {
    const status = ((ps['D:status'] ?? ps['status']) as string[])?.[0] ?? ''
    if (status.includes('200')) {
      return ((ps['D:prop'] ?? ps['prop']) as unknown[])?.[0] as Record<string, unknown> ?? null
    }
  }
  return ((list[0] as Record<string, unknown>)?.['D:prop'] as unknown[])?.[0] as Record<string, unknown> ?? null
}

// 변경 경로 추출: S:added-path / S:modified-path / S:deleted-path / S:replaced-path
function extractChangedPaths(entry: Record<string, unknown>): Array<{ path: string; action: string }> {
  const actionMap: Record<string, string> = {
    'added-path': 'A',
    'modified-path': 'M',
    'deleted-path': 'D',
    'replaced-path': 'R',
  }
  const paths: Array<{ path: string; action: string }> = []
  for (const [suffix, action] of Object.entries(actionMap)) {
    const key = Object.keys(entry).find((k) => k === suffix || k.endsWith(':' + suffix))
    if (!key || !entry[key]) continue
    const items = Array.isArray(entry[key]) ? entry[key] as unknown[] : [entry[key]]
    for (const item of items) {
      const p = typeof item === 'string' ? item : ((item as Record<string, unknown>)?._ as string) ?? ''
      if (p) paths.push({ path: p, action })
    }
  }
  // fallback: S:changed-path action=X 형식
  const changedKey = Object.keys(entry).find((k) => k === 'changed-path' || k.endsWith(':changed-path'))
  if (changedKey && paths.length === 0) {
    const items = Array.isArray(entry[changedKey]) ? entry[changedKey] as unknown[] : [entry[changedKey]]
    for (const item of items) {
      const p = typeof item === 'string' ? item : ((item as Record<string, unknown>)?._ as string) ?? ''
      const a = ((item as Record<string, unknown>)?.$  as Record<string, string>)?.action ?? 'M'
      if (p) paths.push({ path: p, action: a })
    }
  }
  return paths
}

async function parseLogReport(xml: string): Promise<SvnLogEntry[]> {
  const parsed = await parseStringPromise(xml) as Record<string, unknown>
  const entries: SvnLogEntry[] = []

  // Case 1: 표준 SVN XML 형식 (<log><logentry>...)
  const log = parsed['log'] as Record<string, unknown> | undefined
  if (log?.['logentry']) {
    for (const entry of log['logentry'] as Record<string, unknown>[]) {
      const changedPaths: Array<{ path: string; action: string }> = []
      const pathsEl = (entry['paths'] as Record<string, unknown>[])?.[0]
      if (pathsEl?.['path']) {
        for (const p of pathsEl['path'] as unknown[]) {
          const pathStr = typeof p === 'string' ? p : ((p as Record<string, unknown>)?._ as string) ?? ''
          const action = ((p as Record<string, unknown>)?.$  as Record<string, string>)?.action ?? 'M'
          if (pathStr) changedPaths.push({ path: pathStr, action })
        }
      }
      entries.push({
        revision: ((entry['$'] as Record<string, string>)?.revision) ?? '',
        author: (entry['author'] as string[])?.[0] ?? '',
        date: (entry['date'] as string[])?.[0] ?? '',
        message: (entry['msg'] as string[])?.[0] ?? '',
        changedPaths,
      })
    }
    return entries
  }

  // Case 2: WebDAV SVN 형식 (<S:log-report><S:log-item>...)
  const reportKey = Object.keys(parsed).find((k) => k === 'log-report' || k.endsWith(':log-report'))
  if (reportKey) {
    const report = parsed[reportKey] as Record<string, unknown>
    const itemKey = Object.keys(report).find((k) => k === 'log-item' || k.endsWith(':log-item'))
    if (itemKey) {
      for (const entry of report[itemKey] as Record<string, unknown>[]) {
        entries.push({
          revision: findProp(entry, 'version-name') ?? '',
          author: findProp(entry, 'creator-displayname') ?? '',
          date: findProp(entry, 'date') ?? '',
          message: findProp(entry, 'comment') ?? '',
          changedPaths: extractChangedPaths(entry),
        })
      }
    }
  }
  return entries
}

function entryToCommitLog(entry: SvnLogEntry): CommitLog {
  return {
    revision: entry.revision,
    author: entry.author,
    message: entry.message,
    date: entry.date,
    changedPaths: entry.changedPaths.map((p) => ({ path: p.path, action: p.action })),
  }
}

function buildUnifiedDiff(filePath: string, oldContent: string, newContent: string, status: FileDiff['status']): string {
  if (status === 'added') {
    const lines = newContent.split('\n')
    return `--- /dev/null\n+++ b/${filePath}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}`
  }
  if (status === 'deleted') {
    const lines = oldContent.split('\n')
    return `--- a/${filePath}\n+++ /dev/null\n@@ -1,${lines.length} +0,0 @@\n${lines.map((l) => `-${l}`).join('\n')}`
  }
  return Diff.createPatch(filePath, oldContent, newContent, undefined, undefined, { context: 3 })
}
