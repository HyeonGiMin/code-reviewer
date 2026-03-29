import Link from 'next/link'
import { ChevronLeft, GitCommitHorizontal, User, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const MOCK_LOGS = [
  { revision: 'a1b2c3d', author: 'hyeon', message: 'feat: 로그인 기능 추가', date: '2026-03-29T10:00:00Z', filesChanged: 5 },
  { revision: 'e4f5g6h', author: 'hyeon', message: 'fix: 회원가입 유효성 검사 오류 수정', date: '2026-03-28T15:30:00Z', filesChanged: 2 },
  { revision: 'i7j8k9l', author: 'hyeon', message: 'refactor: DB 연결 모듈 분리', date: '2026-03-27T09:00:00Z', filesChanged: 8 },
  { revision: 'm1n2o3p', author: 'hyeon', message: 'chore: 패키지 업데이트', date: '2026-03-26T14:20:00Z', filesChanged: 1 },
  { revision: 'q4r5s6t', author: 'hyeon', message: 'docs: README 작성', date: '2026-03-25T11:00:00Z', filesChanged: 1 },
]

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '오늘'
  if (days === 1) return '어제'
  return `${days}일 전`
}

export default function LogsPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-muted-foreground hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-800">커밋 로그</h2>
          <p className="text-sm text-muted-foreground mt-0.5">레포지토리 #{params.id}</p>
        </div>
      </div>

      {/* 로그 목록 */}
      <div className="space-y-2">
        {MOCK_LOGS.map((log) => (
          <Link
            key={log.revision}
            href={`/dashboard/repositories/${params.id}/logs/${log.revision}`}
            className="group flex items-center gap-4 bg-white rounded-xl border border-border px-5 py-4 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors shrink-0">
              <GitCommitHorizontal className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 group-hover:text-primary transition-colors truncate">
                {log.message}
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

            <div className="flex items-center gap-3 shrink-0">
              <Badge variant="secondary" className="text-xs font-mono">
                {log.revision.slice(0, 7)}
              </Badge>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {log.filesChanged}개 파일
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
