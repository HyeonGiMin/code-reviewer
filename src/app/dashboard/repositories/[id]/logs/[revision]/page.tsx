'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, User, Clock, FileText, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ─── 목업 데이터 ───────────────────────────────────────────
const MOCK_COMMIT = {
  revision: 'a1b2c3d',
  author: 'hyeon',
  date: '2026-03-29T10:00:00Z',
  message: 'feat: 로그인 기능 추가',
}

const MOCK_FILES = [
  {
    filePath: 'src/app/auth/signin/page.tsx',
    status: 'added' as const,
    diff: `--- /dev/null
+++ b/src/app/auth/signin/page.tsx
@@ -0,0 +1,12 @@
+'use client'
+
+import { useState } from 'react'
+import { signIn } from 'next-auth/react'
+
+export default function SignInPage() {
+  const [form, setForm] = useState({ email: '', password: '' })
+
+  return (
+    <form>
+      <input type="email" />
+      <button>로그인</button>
+    </form>
+  )
+}`,
  },
  {
    filePath: 'src/lib/auth.ts',
    status: 'modified' as const,
    diff: `--- a/src/lib/auth.ts
+++ b/src/lib/auth.ts
@@ -1,5 +1,15 @@
 import NextAuth from 'next-auth'
+import Credentials from 'next-auth/providers/credentials'
+import bcrypt from 'bcryptjs'
+import pool from './postgres'

-export const { handlers } = NextAuth({})
+export const { handlers, signIn, signOut, auth } = NextAuth({
+  providers: [
+    Credentials({
+      async authorize(credentials) {
+        const { rows } = await pool.query(
+          'SELECT * FROM users WHERE email = $1',
+          [credentials.email]
+        )
+        return rows[0] ?? null
+      },
+    }),
+  ],
+})`,
  },
  {
    filePath: 'src/lib/old-auth.ts',
    status: 'deleted' as const,
    diff: `--- a/src/lib/old-auth.ts
+++ /dev/null
@@ -1,5 +0,0 @@
-import NextAuth from 'next-auth'
-
-export const { handlers } = NextAuth({
-  providers: [],
-})`,
  },
]

// ─── diff 파서 ────────────────────────────────────────────
interface DiffRow {
  left: { text: string; type: 'removed' | 'context' | 'empty' }
  right: { text: string; type: 'added' | 'context' | 'empty' }
}

function parseSideBySide(diff: string): DiffRow[] {
  const lines = diff.split('\n').filter(
    (l) => !l.startsWith('---') && !l.startsWith('+++') && !l.startsWith('@@')
  )
  const rows: DiffRow[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.startsWith('-')) {
      // 다음 줄이 +이면 수정
      if (i + 1 < lines.length && lines[i + 1].startsWith('+')) {
        rows.push({
          left: { text: line.slice(1), type: 'removed' },
          right: { text: lines[i + 1].slice(1), type: 'added' },
        })
        i += 2
      } else {
        rows.push({
          left: { text: line.slice(1), type: 'removed' },
          right: { text: '', type: 'empty' },
        })
        i++
      }
    } else if (line.startsWith('+')) {
      rows.push({
        left: { text: '', type: 'empty' },
        right: { text: line.slice(1), type: 'added' },
      })
      i++
    } else {
      const text = line.startsWith(' ') ? line.slice(1) : line
      rows.push({
        left: { text, type: 'context' },
        right: { text, type: 'context' },
      })
      i++
    }
  }
  return rows
}

// ─── 상수 ─────────────────────────────────────────────────
const STATUS_STYLE = {
  added: 'text-green-600 bg-green-50',
  modified: 'text-yellow-600 bg-yellow-50',
  deleted: 'text-red-600 bg-red-50',
}
const STATUS_LABEL = { added: 'A', modified: 'M', deleted: 'D' }

const CELL_BG = {
  removed: 'bg-red-50 text-red-800',
  added: 'bg-green-50 text-green-800',
  context: 'text-gray-700',
  empty: 'bg-gray-50',
}

// ─── 컴포넌트 ─────────────────────────────────────────────
export default function ReviewPage({ params }: { params: { id: string; revision: string } }) {
  const [selectedFile, setSelectedFile] = useState<typeof MOCK_FILES[0] | null>(null)
  const [logComment, setLogComment] = useState('')
  const [fileComment, setFileComment] = useState('')

  const diffRows = selectedFile ? parseSideBySide(selectedFile.diff) : []

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)] min-h-0">

      {/* ── 좌측 패널 ── */}
      <aside className="w-60 shrink-0 flex flex-col gap-3 overflow-y-auto">
        <Link
          href={`/dashboard/repositories/${params.id}/logs`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          로그 목록
        </Link>

        {/* 커밋 정보 — 더블클릭 시 전체 코멘트 */}
        <div
          onClick={() => setSelectedFile(null)}
          className={cn(
            'bg-white rounded-xl border p-4 space-y-3 shrink-0 cursor-pointer transition-colors',
            !selectedFile ? 'border-blue-400 ring-2 ring-blue-100' : 'border-border hover:border-blue-300'
          )}
          title="클릭 시 전체 코멘트"
        >
          <p className="text-sm font-semibold text-gray-800 leading-snug">{MOCK_COMMIT.message}</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              {MOCK_COMMIT.author}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              {new Date(MOCK_COMMIT.date).toLocaleString('ko-KR')}
            </div>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">{MOCK_COMMIT.revision}</Badge>
        </div>

        {/* 변경 파일 목록 */}
        <div className="bg-white rounded-xl border border-border overflow-hidden shrink-0">
          <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-gray-700">변경 파일</span>
            <span className="ml-auto text-xs text-muted-foreground">{MOCK_FILES.length}개</span>
          </div>

          <div className="divide-y divide-border">
            {MOCK_FILES.map((file) => (
              <button
                key={file.filePath}
                onClick={() => setSelectedFile(file)}
                className={cn(
                  'w-full flex items-center gap-2 px-4 py-2.5 text-left transition-colors',
                  selectedFile?.filePath === file.filePath
                    ? 'bg-blue-50 text-blue-700'
                    : 'hover:bg-gray-50'
                )}
              >
                <span className={cn('text-xs font-bold w-4 text-center shrink-0', STATUS_STYLE[file.status])}>
                  {STATUS_LABEL[file.status]}
                </span>
                <span className="text-xs font-mono text-gray-600 truncate">
                  {file.filePath.split('/').pop()}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── 우측 패널 ── */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 overflow-hidden">

        {selectedFile ? (
          // ── 파일 diff (좌우 분할) ──
          <>
            <div className="bg-white rounded-xl border border-border overflow-hidden flex flex-col flex-1 min-h-0">
              {/* 파일명 헤더 */}
              <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 shrink-0">
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', STATUS_STYLE[selectedFile.status])}>
                  {STATUS_LABEL[selectedFile.status]}
                </span>
                <span className="text-sm font-mono text-gray-700">{selectedFile.filePath}</span>
              </div>

              {/* side-by-side diff */}
              <div className="flex flex-1 min-h-0 overflow-hidden font-mono text-xs divide-x divide-border">
                {/* 이전 (좌) */}
                <div className="flex-1 overflow-auto">
                  <div className="px-3 py-1.5 bg-gray-50 text-xs text-muted-foreground font-sans border-b border-border sticky top-0">
                    이전
                  </div>
                  {diffRows.map((row, i) => (
                    <div
                      key={i}
                      className={cn('px-3 py-0.5 leading-6 whitespace-pre min-w-0', CELL_BG[row.left.type])}
                    >
                      {row.left.text || ' '}
                    </div>
                  ))}
                </div>

                {/* 변경 후 (우) */}
                <div className="flex-1 overflow-auto">
                  <div className="px-3 py-1.5 bg-gray-50 text-xs text-muted-foreground font-sans border-b border-border sticky top-0">
                    변경 후
                  </div>
                  {diffRows.map((row, i) => (
                    <div
                      key={i}
                      className={cn('px-3 py-0.5 leading-6 whitespace-pre min-w-0', CELL_BG[row.right.type])}
                    >
                      {row.right.text || ' '}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 파일 코멘트 */}
            <div className="bg-white rounded-xl border border-border p-4 shrink-0">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                파일 코멘트
                <span className="font-mono text-muted-foreground font-normal">
                  — {selectedFile.filePath.split('/').pop()}
                </span>
              </p>
              <textarea
                value={fileComment}
                onChange={(e) => setFileComment(e.target.value)}
                placeholder="이 파일에 대한 코멘트를 작성하세요..."
                className="w-full border border-border rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[80px]"
              />
              <div className="flex justify-end mt-2">
                <Button size="sm" disabled={!fileComment.trim()}>저장</Button>
              </div>
            </div>
          </>
        ) : (
          // ── 전체 로그 코멘트 ──
          <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              전체 커밋 코멘트
            </p>
            <p className="text-xs text-muted-foreground">
              이 커밋 전체에 대한 리뷰 코멘트를 작성합니다.
            </p>
            <textarea
              value={logComment}
              onChange={(e) => setLogComment(e.target.value)}
              placeholder="이 커밋에 대한 리뷰를 작성하세요..."
              className="w-full border border-border rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[160px]"
            />
            <div className="flex justify-end">
              <Button size="sm" disabled={!logComment.trim()}>저장</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
