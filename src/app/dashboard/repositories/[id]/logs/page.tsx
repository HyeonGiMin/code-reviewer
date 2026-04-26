import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, GitCommitHorizontal, User, Clock, AlertCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'
import type { CommitLog } from '@/types'
import { unstable_cache } from 'next/cache'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

export default async function LogsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const repo = await getRepository(Number(id), Number(session.user.id))
  if (!repo) redirect('/dashboard')

  let logs: CommitLog[] = []
  let error: string | null = null

  try {
    const fetchLogs = unstable_cache(
      async (repoData) => {
        const provider = createVcsProvider(repoData)
        return await provider.getLogs(50)
      },
      [`repo-logs-${repo.id}`],
      { revalidate: 60, tags: [`repo-${repo.id}`] }
    )
    
    logs = await fetchLogs(repo)
  } catch (e) {
    error = e instanceof Error ? e.message : '로그를 불러오지 못했습니다.'
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{repo.name}</h2>
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
              className="group flex items-center gap-4 bg-white rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
            >
              <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
                <GitCommitHorizontal className="w-5 h-5" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors truncate">
                  {log.message || '(메시지 없음)'}
                </p>
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

              <Badge variant="secondary" className="text-xs font-mono shrink-0">
                {log.revision.slice(0, 7)}
              </Badge>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
