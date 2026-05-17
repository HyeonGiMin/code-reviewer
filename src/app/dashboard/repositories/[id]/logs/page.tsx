import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, GitCommitHorizontal, User, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'
import connectMongoDB from '@/lib/mongodb'
import Review from '@/models/Review'
import type { CommitLog, ReviewStatus } from '@/types'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

function RevisionBadge({ revision, isSvn }: { revision: string; isSvn: boolean }) {
  const label = isSvn ? `r${revision}` : revision.slice(0, 7)
  return (
    <Badge variant="secondary" className="text-xs font-mono shrink-0">
      {label}
    </Badge>
  )
}

const STATUS_DOT: Record<ReviewStatus, { color: string; label: string }> = {
  pending:       { color: 'bg-[#d0d7de]',  label: '미검토' },
  approved:      { color: 'bg-[#1a7f37]',  label: '승인' },
  needs_changes: { color: 'bg-[#cf222e]',  label: '수정 필요' },
}

function StatusDot({ status }: { status: ReviewStatus | undefined }) {
  if (!status || status === 'pending') return null
  const cfg = STATUS_DOT[status]
  return (
    <span
      title={cfg.label}
      className={`w-2 h-2 rounded-full shrink-0 ${cfg.color}`}
    />
  )
}


export default async function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const repo = await getRepository(Number(id), Number(session.user.id))
  if (!repo) redirect('/dashboard')

  const isSvn = repo.vcsType === 'svn'
  let logs: CommitLog[] = []
  let error: string | null = null

  try {
    const provider = createVcsProvider(repo)
    logs = await provider.getLogs(50)
  } catch (e) {
    error = e instanceof Error ? e.message : '로그를 불러오지 못했습니다.'
  }

  // 각 커밋의 리뷰 상태를 배치 조회
  let statusMap: Record<string, ReviewStatus> = {}
  if (logs.length > 0) {
    try {
      await connectMongoDB()
      const reviews = await Review.find({
        repositoryId: Number(id),
        userId: Number(session.user.id),
        revision: { $in: logs.map((l) => l.revision) },
      }).select('revision status').lean()
      statusMap = Object.fromEntries(
        reviews.map((r) => [r.revision, (r.status as ReviewStatus) ?? 'pending'])
      )
    } catch {
      // 상태 조회 실패 시 배지 없이 렌더
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-800">{repo.name}</h2>
            <Badge variant="outline" className={`text-xs ${isSvn ? 'text-purple-600 border-purple-300' : 'text-orange-500 border-orange-300'}`}>
              {repo.vcsType.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-sm">{repo.url}</p>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">로그를 불러오지 못했습니다</p>
            <p className="text-xs mt-1 text-red-500">{error}</p>
          </div>
        </div>
      ) : logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">커밋이 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Link
              key={log.revision}
              href={`/dashboard/repositories/${id}/logs/${log.revision}`}
              className="group block bg-white rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                  <GitCommitHorizontal className="w-5 h-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusDot status={statusMap[log.revision]} />
                    <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors line-clamp-2 whitespace-pre-line">
                      {log.message.trim() || '(메시지 없음)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      {log.author}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {timeAgo(log.date)}
                    </span>
                  </div>
                </div>

                <RevisionBadge revision={log.revision} isSvn={isSvn} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
