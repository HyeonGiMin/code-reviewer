'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  ChevronLeft, User, Clock, FileText, MessageSquare,
  Loader2, AlertCircle, ChevronDown, ChevronRight, Copy,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CommitLog, FileDiff, ReviewComment } from '@/types'

// ─── 파일 아이콘 (VSCode Material 스타일) ─────────────────
import { FileIcon as RawFileIcon, defaultStyles } from 'react-file-icon'

type FileIconStyle = Parameters<typeof RawFileIcon>[0]

const EXT_STYLES: Record<string, Partial<FileIconStyle>> = {
  // defaultStyles에 있는 것
  ts:   { ...defaultStyles.ts },
  js:   { ...defaultStyles.js },
  jsx:  { ...defaultStyles.jsx },
  py:   { ...defaultStyles.py },
  json: { ...defaultStyles.json },
  md:   { ...defaultStyles.md },
  css:  { ...defaultStyles.css },
  scss: { ...defaultStyles.scss },
  html: { ...defaultStyles.html },
  htm:  { ...defaultStyles.htm },
  java: { ...defaultStyles.java },
  rb:   { ...defaultStyles.rb },
  php:  { ...defaultStyles.php },
  yml:  { ...defaultStyles.yml },
  yaml: { ...defaultStyles.yml },
  // defaultStyles에 없는 것 — 직접 지정 (extension이 자동 레이블)
  tsx:    { ...defaultStyles.ts,  labelColor: '#fff' },
  go:     { type: 'code', color: '#00add8', labelColor: '#fff' },
  rs:     { type: 'code', color: '#dea584', labelColor: '#222' },
  sql:    { type: 'document', color: '#dad8d8', labelColor: '#444' },
  sh:     { type: 'code', color: '#4eaa25', labelColor: '#fff' },
  vue:    { type: 'code', color: '#41b883', labelColor: '#fff' },
  svelte: { type: 'code', color: '#ff3e00', labelColor: '#fff' },
  xml:    { type: 'code', color: '#e37933', labelColor: '#fff' },
  toml:   { type: 'document', color: '#9c4221', labelColor: '#fff' },
  lock:   { type: 'document', color: '#aaa', labelColor: '#fff' },
  env:    { type: 'document', color: '#ecd53f', labelColor: '#333' },
  gitignore: { type: 'document', color: '#f05032', labelColor: '#fff' },
}

function FileIcon({ name, isDir = false }: { name: string; isDir?: boolean }) {
  if (isDir) {
    return (
      <span className="inline-flex items-center justify-center shrink-0" style={{ width: 16, height: 16 }}>
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
          <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5h4l1 1.5h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7.5z" fill="#dcb44a" />
        </svg>
      </span>
    )
  }
  const lower = name.toLowerCase()
  const ext = lower.includes('.') ? lower.split('.').pop()! : ''
  const style: Partial<FileIconStyle> = EXT_STYLES[ext] ?? {}
  return (
    <span className="inline-flex shrink-0" style={{ width: 16, height: 16 }}>
      <RawFileIcon extension={ext} {...style} />
    </span>
  )
}

// ─── 파일 트리 ───────────────────────────────────────────
interface TreeNode {
  name: string
  fullPath: string
  type: 'dir' | 'file'
  children: Map<string, TreeNode>
  file?: FileDiff
}

function buildTree(files: FileDiff[]): TreeNode {
  const root: TreeNode = { name: '', fullPath: '', type: 'dir', children: new Map() }
  for (const file of files) {
    const parts = file.filePath.split('/')
    let node = root
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const isLast = i === parts.length - 1
      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          fullPath: parts.slice(0, i + 1).join('/'),
          type: isLast ? 'file' : 'dir',
          children: new Map(),
          file: isLast ? file : undefined,
        })
      }
      node = node.children.get(part)!
    }
  }
  return root
}

function TreeDir({
  node, depth, activeFile, onSelect,
}: {
  node: TreeNode
  depth: number
  activeFile: string | null
  onSelect: (path: string) => void
}) {
  const [open, setOpen] = useState(true)
  const children = [...node.children.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <div>
      {/* 폴더 행 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-1.5 py-1 pr-3 text-left hover:bg-[#f6f8fa] transition-colors"
        style={{ paddingLeft: depth * 12 + 8 }}
      >
        {open
          ? <ChevronDown className="w-3 h-3 shrink-0 text-[#656d76]" />
          : <ChevronRight className="w-3 h-3 shrink-0 text-[#656d76]" />}
        <FileIcon name={node.name} isDir />
        <span className="text-xs text-[#656d76] truncate">{node.name}</span>
      </button>

      {open && children.map((child) =>
        child.type === 'dir' ? (
          <TreeDir key={child.name} node={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />
        ) : (
          <TreeFile key={child.name} node={child} depth={depth + 1} activeFile={activeFile} onSelect={onSelect} />
        )
      )}
    </div>
  )
}

function TreeFile({
  node, depth, activeFile, onSelect,
}: {
  node: TreeNode
  depth: number
  activeFile: string | null
  onSelect: (path: string) => void
}) {
  const { added, removed } = diffStats(node.file!.diff)
  const isActive = activeFile === node.fullPath
  const status = node.file?.status

  return (
    <button
      onClick={() => onSelect(node.fullPath)}
      className={cn(
        'w-full flex items-center gap-1.5 py-1 pr-3 text-left transition-colors',
        isActive ? 'bg-[#ddf4ff]' : 'hover:bg-[#f6f8fa]'
      )}
      style={{ paddingLeft: depth * 12 + 8 }}
    >
      <span className="w-3 shrink-0" />
      <FileIcon name={node.name} />
      <span className={cn('text-xs font-mono truncate flex-1 min-w-0', isActive ? 'text-[#0969da]' : status === 'deleted' ? 'text-[#656d76] line-through' : 'text-[#1f2328]')}>
        {node.name}
      </span>
      {status === 'added' && <span className="text-[10px] px-1 rounded-sm bg-[#e6ffec] text-[#1a7f37] border border-[#1a7f37]/20" title="Added">A</span>}
      {status === 'modified' && <span className="text-[10px] px-1 rounded-sm bg-[#ddf4ff] text-[#0969da] border border-[#0969da]/20" title="Modified">M</span>}
      {status === 'deleted' && <span className="text-[10px] px-1 rounded-sm bg-[#ffebe9] text-[#82071e] border border-[#82071e]/20" title="Deleted">D</span>}
      <span className="text-[10px] text-[#1a7f37] font-semibold shrink-0 ml-1">+{added}</span>
      <span className="text-[10px] text-[#82071e] font-semibold shrink-0">−{removed}</span>
    </button>
  )
}

// ─── diff 파서 → split view 행 생성 ─────────────────────
interface SplitRow {
  type: 'context' | 'changed' | 'hunk'
  leftNo: number | null
  leftText: string | null   // null = 빈 칸
  leftType: 'removed' | 'context' | 'empty'
  rightNo: number | null
  rightText: string | null  // null = 빈 칸
  rightType: 'added' | 'context' | 'empty'
  hunkText?: string
}

function parseSplitRows(raw: string): SplitRow[] {
  const lines = raw.split('\n')
  const rows: SplitRow[] = []
  let oldNo = 1
  let newNo = 1
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('---') || line.startsWith('+++')) { i++; continue }

    if (line.startsWith('@@')) {
      const m = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) { oldNo = Number(m[1]); newNo = Number(m[2]) }
      rows.push({ type: 'hunk', leftNo: null, leftText: null, leftType: 'empty', rightNo: null, rightText: null, rightType: 'empty', hunkText: line })
      i++; continue
    }

    if (line.startsWith('-')) {
      // removed 블록 수집
      const removed: string[] = []
      while (i < lines.length && lines[i].startsWith('-')) { removed.push(lines[i].slice(1)); i++ }
      // 바로 뒤 added 블록 수집
      const added: string[] = []
      while (i < lines.length && lines[i].startsWith('+')) { added.push(lines[i].slice(1)); i++ }

      const maxLen = Math.max(removed.length, added.length)
      for (let j = 0; j < maxLen; j++) {
        const hasL = j < removed.length
        const hasR = j < added.length
        rows.push({
          type: 'changed',
          leftNo:   hasL ? oldNo++ : null,
          leftText: hasL ? removed[j] : null,
          leftType: hasL ? 'removed' : 'empty',
          rightNo:   hasR ? newNo++ : null,
          rightText: hasR ? added[j] : null,
          rightType: hasR ? 'added' : 'empty',
        })
      }
      continue
    }

    if (line.startsWith('+')) {
      rows.push({
        type: 'changed',
        leftNo: null, leftText: null, leftType: 'empty',
        rightNo: newNo++, rightText: line.slice(1), rightType: 'added',
      })
      i++; continue
    }

    // context
    const text = line.startsWith(' ') ? line.slice(1) : line
    rows.push({
      type: 'context',
      leftNo: oldNo++, leftText: text, leftType: 'context',
      rightNo: newNo++, rightText: text, rightType: 'context',
    })
    i++
  }
  return rows
}

function diffStats(raw: string) {
  const lines = raw.split('\n')
  return {
    added:   lines.filter((l) => l.startsWith('+')).length,
    removed: lines.filter((l) => l.startsWith('-') && !l.startsWith('---')).length,
  }
}

// ─── Split diff 테이블 (단일 스크롤) ─────────────────────
const CELL_BG: Record<string, string> = {
  removed: '#ffebe9', added: '#e6ffec', context: '#ffffff', empty: '#f6f8fa',
}
const LINO_BG: Record<string, string> = {
  removed: '#ffd7d5', added: '#cdffd8', context: '#ffffff', empty: '#f6f8fa',
}
const TEXT_COLOR: Record<string, string> = {
  removed: '#82071e', added: '#1a7f37', context: '#1f2328', empty: '',
}

function DiffTable({ rows }: { rows: SplitRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse font-mono text-xs table-fixed">
        <colgroup>
          <col className="w-[50px]" />{/* left lineno */}
          <col />{/* left content */}
          <col className="w-[1px] bg-[#d0d7de]" />{/* divider */}
          <col className="w-[50px]" />{/* right lineno */}
          <col />{/* right content */}
        </colgroup>
        <tbody>
          {rows.map((row, i) => {
            if (row.type === 'hunk') {
              return (
                <tr key={i}>
                  <td colSpan={5} className="px-3 py-0.5 text-[#0969da] whitespace-pre leading-5 bg-[#ddf4ff] border-y border-[#d0d7de]">
                    {row.hunkText}
                  </td>
                </tr>
              )
            }

            return (
              <tr key={i}>
                {/* 왼쪽 라인번호 */}
                <td
                  className="select-none text-right px-2 py-0.5 text-[11px] leading-5 border-r border-[#d0d7de]"
                  style={{ backgroundColor: LINO_BG[row.leftType], color: '#656d76' }}
                >
                  {row.leftNo ?? ''}
                </td>
                {/* 왼쪽 내용 */}
                <td
                  className="px-3 py-0.5 whitespace-pre leading-5 overflow-hidden"
                  style={{ backgroundColor: CELL_BG[row.leftType], color: TEXT_COLOR[row.leftType] }}
                >
                  {row.leftType === 'removed' && <span className="select-none text-[#82071e] mr-1">-</span>}
                  {row.leftText ?? ''}
                </td>
                {/* 중앙 구분선 */}
                <td className="p-0 border-x border-[#d0d7de] bg-[#d0d7de]" style={{ width: 1 }} />
                {/* 오른쪽 라인번호 */}
                <td
                  className="select-none text-right px-2 py-0.5 text-[11px] leading-5 border-r border-[#d0d7de]"
                  style={{ backgroundColor: LINO_BG[row.rightType], color: '#656d76' }}
                >
                  {row.rightNo ?? ''}
                </td>
                {/* 오른쪽 내용 */}
                <td
                  className="px-3 py-0.5 whitespace-pre leading-5 overflow-hidden"
                  style={{ backgroundColor: CELL_BG[row.rightType], color: TEXT_COLOR[row.rightType] }}
                >
                  {row.rightType === 'added' && <span className="select-none text-[#1a7f37] mr-1">+</span>}
                  {row.rightText ?? ''}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── 파일 블록 ────────────────────────────────────────────
function FileDiffBlock({ file, active, onSelect }: {
  file: FileDiff
  active: boolean
  onSelect: () => void
}) {
  const [open, setOpen] = useState(true)
  const rows = parseSplitRows(file.diff)
  const { added, removed } = diffStats(file.diff)

  function copyPath() {
    navigator.clipboard.writeText(file.filePath)
  }

  return (
    <div
      id={`file-${file.filePath}`}
      className={cn(
        'rounded-md border overflow-hidden',
        active ? 'border-[#0969da]' : 'border-[#d0d7de]'
      )}
    >
      {/* 파일 헤더 — GitHub 스타일 */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f6f8fa] border-b border-[#d0d7de]">
        <button
          onClick={() => { onSelect(); setOpen((v) => !v) }}
          className="flex items-center text-[#656d76] hover:text-[#1f2328] transition-colors"
        >
          {open
            ? <ChevronDown className="w-4 h-4" />
            : <ChevronRight className="w-4 h-4" />}
        </button>

        <span className="font-mono text-xs font-semibold text-[#1f2328] flex-1 truncate">
          {file.filePath}
        </span>

        {/* +/- 통계 */}
        <div className="flex items-center gap-1 text-xs shrink-0">
          <span className="text-[#1a7f37] font-semibold">+{added}</span>
          <span className="text-[#82071e] font-semibold">−{removed}</span>
        </div>

        {/* 파일명 복사 */}
        <button
          onClick={copyPath}
          className="p-1 rounded text-[#656d76] hover:text-[#1f2328] hover:bg-[#e7ecf0] transition-colors"
          title="파일 경로 복사"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && <DiffTable rows={rows} />}
    </div>
  )
}

// ─── 메인 ─────────────────────────────────────────────────
interface Props { repoId: string; commit: CommitLog }

export default function ReviewClient({ repoId, commit }: Props) {
  const [diffs, setDiffs] = useState<FileDiff[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  // 전체 코멘트 데이터
  const [allComments, setAllComments] = useState<ReviewComment[]>([])
  
  // null = 커밋 전체 코멘트 모드, string = 파일 코멘트 모드
  const [activeFile, setActiveFile] = useState<string | null>(null)
  const [commitComment, setCommitComment] = useState('')
  const [fileComment, setFileComment] = useState('')

  // Diff 데이터와 기존 리뷰 코멘트 로딩
  useEffect(() => {
    const fetchWithTimeout = (url: string, ms = 30000) => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), ms)
      return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
    }

    Promise.allSettled([
      fetchWithTimeout(`/api/repositories/${repoId}/diff/${commit.revision}`).then(r => r.json()),
      fetchWithTimeout(`/api/repositories/${repoId}/reviews/${commit.revision}`).then(r => r.json()),
    ])
      .then(([diffResult, reviewResult]) => {
        if (diffResult.status === 'rejected') throw new Error(diffResult.reason?.message ?? 'diff 로드 실패')
        const diffData = diffResult.value
        if (diffData.error) throw new Error(diffData.error)
        setDiffs(diffData)

        const comments = reviewResult.status === 'fulfilled' ? (reviewResult.value.comments ?? []) : []
        setAllComments(comments)
        setCommitComment(comments.find((c: ReviewComment) => !c.filePath)?.body || '')
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoading(false))
  }, [repoId, commit.revision])

  // 파일 선택 시 해당 파일의 기존 코멘트 복원
  function selectFile(filePath: string) {
    setActiveFile(filePath)
    setFileComment(allComments.find(c => c.filePath === filePath)?.body || '')
  }

  // 코멘트 저장 함수 (공통)
  async function saveComment(filePath: string | undefined, body: string) {
    try {
      const res = await fetch(`/api/repositories/${repoId}/reviews/${commit.revision}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, body })
      })
      if (!res.ok) throw new Error('저장 실패')
      const updatedReview = await res.json()
      setAllComments(updatedReview.comments || [])
      toast.success('저장되었습니다.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  const selectedDiff = diffs.find((d) => d.filePath === activeFile)

  return (
    <div data-layout="fullpage" className="flex flex-col h-full bg-white">

      {/* ── 상단 커밋 헤더 (클릭 → 커밋 코멘트 모드) ── */}
      <button
        onClick={() => setActiveFile(null)}
        className={cn(
          'shrink-0 border-b px-6 py-4 flex items-start gap-4 flex-wrap w-full text-left transition-colors',
          activeFile === null
            ? 'border-[#0969da] bg-[#f0f6ff]'
            : 'border-[#d0d7de] bg-white hover:bg-[#f6f8fa]'
        )}
      >
        <Link
          href={`/dashboard/repositories/${repoId}/logs`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-sm text-[#656d76] hover:text-[#1f2328] transition-colors shrink-0 mt-0.5"
        >
          <ChevronLeft className="w-4 h-4" />로그
        </Link>
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="max-h-[120px] overflow-y-auto pr-1">
            <p className="text-[15px] font-semibold text-[#1f2328] leading-snug whitespace-pre-wrap">{commit.message || '(메시지 없음)'}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-[#656d76] flex-wrap">
            <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{commit.author}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" />{new Date(commit.date).toLocaleString('ko-KR')}</span>
            <Badge variant="secondary" className="font-mono">{commit.revision.slice(0, 7)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 mt-1">
          {!loading && !fetchError && (
            <span className="flex items-center gap-1.5 text-xs text-[#656d76]">
              <FileText className="w-3.5 h-3.5" />{diffs.length}개 파일
            </span>
          )}
          {activeFile === null && (
            <span className="text-xs text-[#0969da] font-medium">커밋 코멘트 작성 중</span>
          )}
        </div>
      </button>

      {/* ── 바디: 좌측 파일목록 + 우측 컨텐츠 ── */}
      <div className="flex flex-1 min-h-0" style={{ backgroundColor: '#f6f8fa' }}>

        {/* 좌측 파일 트리 */}
        <aside className="w-60 shrink-0 border-r border-[#d0d7de] flex flex-col overflow-y-auto bg-white">
          <div className="px-4 py-2 border-b border-[#d0d7de] flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#656d76]" />
            <span className="text-xs font-semibold text-[#1f2328]">변경된 파일</span>
            {!loading && <span className="ml-auto text-xs text-[#656d76]">{diffs.length}개</span>}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8 gap-1.5 text-xs text-[#656d76]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />불러오는 중
            </div>
          ) : fetchError ? (
            <div className="px-3 py-3 text-xs text-red-500 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />{fetchError}
            </div>
          ) : (
            <div className="py-1">
              {[...buildTree(diffs).children.values()]
                .sort((a, b) => {
                  if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
                  return a.name.localeCompare(b.name)
                })
                .map((node) =>
                  node.type === 'dir' ? (
                    <TreeDir key={node.name} node={node} depth={0} activeFile={activeFile} onSelect={selectFile} />
                  ) : (
                    <TreeFile key={node.name} node={node} depth={0} activeFile={activeFile} onSelect={selectFile} />
                  )
                )}
            </div>
          )}
        </aside>

        {/* 우측: 모드별 컨텐츠 */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0">

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4">
            {loading ? (
              <div className="flex items-center justify-center py-20 gap-2 text-sm text-[#656d76]">
                <Loader2 className="w-4 h-4 animate-spin" />diff 불러오는 중...
              </div>
            ) : fetchError ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-red-600 bg-white rounded-md border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />{fetchError}
              </div>
            ) : activeFile === null ? (
              /* 커밋 코멘트 모드 */
              <div className="max-w-2xl mx-auto mt-8 bg-white rounded-md border border-[#d0d7de] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#d0d7de] bg-[#f6f8fa] flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#656d76]" />
                  <span className="text-sm font-semibold text-[#1f2328]">커밋 전체 리뷰</span>
                  <span className="ml-auto font-mono text-xs text-[#656d76]">{commit.revision.slice(0, 7)}</span>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <p className="text-xs text-[#656d76]">
                    특정 파일이 아닌 이 커밋 전체에 대한 리뷰 코멘트를 작성합니다.
                    파일별 코멘트를 남기려면 왼쪽 파일 목록에서 파일을 선택하세요.
                  </p>
                  <textarea
                    value={commitComment}
                    onChange={(e) => setCommitComment(e.target.value)}
                    placeholder="이 커밋에 대한 리뷰를 작성하세요..."
                    rows={8}
                    className="w-full border border-[#d0d7de] rounded-md px-3 py-2 text-sm text-[#1f2328] resize-none focus:outline-none focus:ring-2 focus:ring-[#0969da]/30 focus:border-[#0969da]"
                  />
                  <div className="flex justify-end">
                    <Button 
                      size="sm" 
                      onClick={() => saveComment(undefined, commitComment)}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedDiff ? (
              /* 파일 diff 모드 */
              <FileDiffBlock
                file={selectedDiff}
                active
                onSelect={() => {}}
              />
            ) : null}
          </div>

          {/* 하단 고정 코멘트 — 파일 선택 시에만 표시 */}
          {activeFile !== null && (
            <div className="shrink-0 border-t border-[#d0d7de] bg-white px-5 py-3 flex gap-3 items-end shadow-[0_-1px_4px_rgba(0,0,0,0.08)]">
              <div className="flex flex-col flex-1 gap-1.5">
                <span className="text-xs text-[#656d76] flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  파일 코멘트
                  <span className="font-mono text-[#0969da]">— {activeFile.split('/').pop()}</span>
                </span>
                <textarea
                  value={fileComment}
                  onChange={(e) => setFileComment(e.target.value)}
                  placeholder={`${activeFile.split('/').pop()}에 대한 코멘트를 작성하세요...`}
                  rows={2}
                  className="w-full border border-[#d0d7de] rounded-md px-3 py-2 text-sm text-[#1f2328] resize-none focus:outline-none focus:ring-2 focus:ring-[#0969da]/30 focus:border-[#0969da] max-h-[120px]"
                />
              </div>
              <Button 
                size="sm" 
                className="shrink-0 mb-0.5"
                onClick={() => saveComment(activeFile, fileComment)}
              >
                저장
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
