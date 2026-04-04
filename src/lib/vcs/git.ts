import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import { Volume } from 'memfs'
import * as Diff from 'diff'
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
        if ((await parent?.type()) === 'tree' || (await current?.type()) === 'tree') return  // null은 재귀 중단, undefined는 결과 제외만

        const parentFileOid = await parent?.oid()
        const currentFileOid = await current?.oid()
        if (parentFileOid === currentFileOid) return null  // 변경 없음

        let status: FileDiff['status']
        if (!parent) status = 'added'
        else if (!current) status = 'deleted'
        else status = 'modified'

        const decode = (buf: Uint8Array) => new TextDecoder().decode(buf)

        const oldLines = parent ? decode((await git.readBlob({ fs, dir, oid: parentFileOid! })).blob).split('\n') : []
        const newLines = current ? decode((await git.readBlob({ fs, dir, oid: currentFileOid! })).blob).split('\n') : []

        // 간단한 unified diff 생성
        const diff = buildUnifiedDiff(filepath, oldLines, newLines, status)

        return { filePath: filepath, status, diff } satisfies FileDiff
      },
    })

    return ((diffs ?? []) as (FileDiff | null)[]).filter((d): d is FileDiff => d !== null)
  }
}

const CONTEXT_LINES = 3  // hunk 앞뒤 context 라인 수

function buildUnifiedDiff(
  filePath: string,
  oldLines: string[],
  newLines: string[],
  status: FileDiff['status']
): string {
  const fileHeader =
    status === 'added'
      ? `--- /dev/null\n+++ b/${filePath}`
      : status === 'deleted'
      ? `--- a/${filePath}\n+++ /dev/null`
      : `--- a/${filePath}\n+++ b/${filePath}`

  if (status === 'added') {
    const hunk = `@@ -0,0 +1,${newLines.length} @@`
    return `${fileHeader}\n${hunk}\n${newLines.map((l) => `+${l}`).join('\n')}`
  }
  if (status === 'deleted') {
    const hunk = `@@ -1,${oldLines.length} +0,0 @@`
    return `${fileHeader}\n${hunk}\n${oldLines.map((l) => `-${l}`).join('\n')}`
  }

  // modified: diff 계산 후 hunk 단위로 분할
  const parts = Diff.diffLines(oldLines.join('\n'), newLines.join('\n'))

  // 각 part를 라인 배열로 변환
  interface FlatLine { op: '+' | '-' | ' '; text: string }
  const flat: FlatLine[] = []
  for (const part of parts) {
    const ls = part.value.split('\n')
    if (ls[ls.length - 1] === '') ls.pop()
    const op: FlatLine['op'] = part.added ? '+' : part.removed ? '-' : ' '
    for (const l of ls) flat.push({ op, text: l })
  }

  // 변경된 라인 인덱스 수집 → context 범위 계산 → hunk 그룹화
  const changed = new Set(flat.map((l, i) => l.op !== ' ' ? i : -1).filter((i) => i >= 0))
  if (changed.size === 0) return `${fileHeader}\n`

  // 인접 hunk 병합
  const ranges: [number, number][] = []
  for (const idx of [...changed].sort((a, b) => a - b)) {
    const lo = Math.max(0, idx - CONTEXT_LINES)
    const hi = Math.min(flat.length - 1, idx + CONTEXT_LINES)
    if (ranges.length && lo <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = Math.max(ranges[ranges.length - 1][1], hi)
    } else {
      ranges.push([lo, hi])
    }
  }

  const hunkBlocks: string[] = []
  for (const [lo, hi] of ranges) {
    const slice = flat.slice(lo, hi + 1)
    let oldCount = 0, newCount = 0
    for (const l of slice) {
      if (l.op !== '+') oldCount++
      if (l.op !== '-') newCount++
    }
    // old/new 시작 라인번호 계산
    let oldStart = 1, newStart = 1
    for (let i = 0; i < lo; i++) {
      if (flat[i].op !== '+') oldStart++
      if (flat[i].op !== '-') newStart++
    }
    const hunkHeader = `@@ -${oldStart},${oldCount} +${newStart},${newCount} @@`
    const body = slice.map((l) => `${l.op}${l.text}`).join('\n')
    hunkBlocks.push(`${hunkHeader}\n${body}`)
  }

  return `${fileHeader}\n${hunkBlocks.join('\n')}`
}
