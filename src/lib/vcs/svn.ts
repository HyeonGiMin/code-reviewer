import { execFile } from 'child_process'
import { promisify } from 'util'
import { parseStringPromise } from 'xml2js'
import type { CommitLog, FileDiff } from '@/types'
import type { VcsAuth, VcsProvider } from './types'

const execFileAsync = promisify(execFile)

export class SvnProvider implements VcsProvider {
  private url: string
  private auth?: VcsAuth

  constructor(url: string, auth?: VcsAuth) {
    this.url = url
    this.auth = auth
  }

  private authArgs(): string[] {
    if (!this.auth?.username || !this.auth?.token) return ['--no-auth-cache', '--non-interactive']
    return [
      '--no-auth-cache',
      '--non-interactive',
      '--username', this.auth.username,
      '--password', this.auth.token,
    ]
  }

  async getLogs(limit = 30): Promise<CommitLog[]> {
    const { stdout } = await execFileAsync('svn', [
      'log',
      this.url,
      '--xml',
      '--verbose',
      `--limit=${limit}`,
      ...this.authArgs(),
    ])

    const parsed = await parseStringPromise(stdout)
    const entries = parsed?.log?.logentry ?? []

    return entries.map((entry: SvnLogEntry) => ({
      revision: entry.$.revision,
      author: entry.author?.[0] ?? '',
      message: entry.msg?.[0]?.trim() ?? '',
      date: entry.date?.[0] ?? '',
      changedPaths: (entry.paths?.[0]?.path ?? []).map((p: { _: string }) => p._),
    }))
  }

  async getDiff(revision: string): Promise<FileDiff[]> {
    const prev = String(Number(revision) - 1)

    const { stdout } = await execFileAsync('svn', [
      'diff',
      `--old=${this.url}@${prev}`,
      `--new=${this.url}@${revision}`,
      ...this.authArgs(),
    ])

    return parseSvnDiff(stdout)
  }
}

interface SvnLogEntry {
  $: { revision: string }
  author?: string[]
  date?: string[]
  msg?: string[]
  paths?: Array<{ path: Array<{ _: string; $: { action: string } }> }>
}

function parseSvnDiff(raw: string): FileDiff[] {
  const results: FileDiff[] = []
  const fileBlocks = raw.split(/^Index: /m).filter(Boolean)

  for (const block of fileBlocks) {
    const lines = block.split('\n')
    const filePath = lines[0].trim()
    const diffBody = lines.slice(1).join('\n')

    let status: FileDiff['status'] = 'modified'
    if (diffBody.includes('--- /dev/null') || diffBody.match(/^--- .+\(nonexistent\)/m)) {
      status = 'added'
    } else if (diffBody.includes('+++ /dev/null') || diffBody.match(/^\+\+\+ .+\(nonexistent\)/m)) {
      status = 'deleted'
    }

    results.push({ filePath, status, diff: `Index: ${block}` })
  }

  return results
}
