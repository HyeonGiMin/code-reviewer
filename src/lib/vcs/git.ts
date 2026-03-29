import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { Volume } from 'memfs'
import type { CommitLog, FileDiff } from '@/types'
import type { VcsAuth, VcsProvider } from './types'

export class GitProvider implements VcsProvider {
  private url: string
  private auth?: VcsAuth

  constructor(url: string, auth?: VcsAuth) {
    this.url = url
    this.auth = auth
  }

  // 매번 in-memory FS에 shallow clone 후 작업
  private async cloneShallow(depth: number) {
    const fs = Volume.fromJSON({}) as unknown as typeof import('fs')
    const dir = '/repo'

    await git.clone({
      fs,
      http,
      dir,
      url: this.url,
      singleBranch: false,
      depth,
      onAuth: this.auth?.token
        ? () => ({ username: this.auth!.username ?? 'token', password: this.auth!.token! })
        : undefined,
    })

    return { fs, dir }
  }

  async getLogs(limit = 30): Promise<CommitLog[]> {
    const { fs, dir } = await this.cloneShallow(limit)

    const commits = await git.log({ fs, dir, depth: limit })

    return commits.map(({ oid, commit }) => ({
      revision: oid,
      author: commit.author.name,
      message: commit.message.trim(),
      date: new Date(commit.author.timestamp * 1000).toISOString(),
      changedPaths: [],  // log만으로는 변경 파일 목록 불필요, diff에서 제공
    }))
  }

  async getDiff(revision: string): Promise<FileDiff[]> {
    // 해당 커밋 + 부모까지 포함하도록 depth를 넉넉히
    const { fs, dir } = await this.cloneShallow(50)

    const commits = await git.log({ fs, dir })
    const target = commits.find((c) => c.oid.startsWith(revision))
    if (!target) throw new Error(`revision not found: ${revision}`)

    const parentOid = target.commit.parent[0]
    const results: FileDiff[] = []

    const trees = await git.readTree({ fs, dir, oid: target.oid })

    if (!parentOid) {
      // 첫 번째 커밋 — 모든 파일이 added
      for (const entry of trees.tree) {
        if (entry.type !== 'blob') continue
        const { blob } = await git.readBlob({ fs, dir, oid: entry.oid })
        results.push({
          filePath: entry.path,
          status: 'added',
          diff: `+++ b/${entry.path}\n` + new TextDecoder().decode(blob).split('\n').map((l) => `+${l}`).join('\n'),
        })
      }
      return results
    }

    const diffs = await git.walk({
      fs,
      dir,
      trees: [git.TREE({ ref: parentOid }), git.TREE({ ref: target.oid })],
      async map(filepath, [parent, current]) {
        if (!parent && !current) return null
        if ((await parent?.type()) === 'tree' || (await current?.type()) === 'tree') return null

        const parentOid = await parent?.oid()
        const currentOid = await current?.oid()
        if (parentOid === currentOid) return null  // 변경 없음

        let status: FileDiff['status']
        if (!parent) status = 'added'
        else if (!current) status = 'deleted'
        else status = 'modified'

        const decode = (buf: Uint8Array) => new TextDecoder().decode(buf)

        const oldLines = parent ? decode((await git.readBlob({ fs, dir, oid: parentOid! })).blob).split('\n') : []
        const newLines = current ? decode((await git.readBlob({ fs, dir, oid: currentOid! })).blob).split('\n') : []

        // 간단한 unified diff 생성
        const diff = buildUnifiedDiff(filepath, oldLines, newLines, status)

        return { filePath: filepath, status, diff } satisfies FileDiff
      },
    })

    return (diffs as (FileDiff | null)[]).filter((d): d is FileDiff => d !== null)
  }
}

function buildUnifiedDiff(
  filePath: string,
  oldLines: string[],
  newLines: string[],
  status: FileDiff['status']
): string {
  const header =
    status === 'added'
      ? `--- /dev/null\n+++ b/${filePath}`
      : status === 'deleted'
      ? `--- a/${filePath}\n+++ /dev/null`
      : `--- a/${filePath}\n+++ b/${filePath}`

  const body =
    status === 'added'
      ? newLines.map((l) => `+${l}`).join('\n')
      : status === 'deleted'
      ? oldLines.map((l) => `-${l}`).join('\n')
      : [
          ...oldLines.map((l) => `-${l}`),
          ...newLines.map((l) => `+${l}`),
        ].join('\n')

  return `${header}\n${body}`
}
