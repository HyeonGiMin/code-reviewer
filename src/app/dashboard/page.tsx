import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import pool from '@/lib/postgres'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, Plus } from 'lucide-react'

interface Repository {
  id: number
  name: string
  vcs_type: 'git' | 'svn'
  url: string
  http_username?: string
  created_at: string
}

const GitIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M23.546 10.93L13.067.452a1.55 1.55 0 00-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 012.327 2.341l2.658 2.66a1.838 1.838 0 11-1.1 1.1l-2.48-2.48v6.521a1.84 1.84 0 11-1.512-.036V9.003a1.839 1.839 0 01-1-2.426L7.617 3.82.454 10.93a1.55 1.55 0 000 2.19l10.48 10.477a1.55 1.55 0 002.186 0l10.426-10.478a1.55 1.55 0 000-2.188" />
  </svg>
)

const SvnIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
    <path d="M3 3h18v2H3V3zm0 8h18v2H3v-2zm0 8h18v2H3v-2zm3-4h6v2H6v-2zm0-8h6v2H6V7z" />
  </svg>
)

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const { rows: repos } = await pool.query<Repository>(
    `SELECT id, name, vcs_type, url, http_username, created_at
     FROM repositories WHERE user_id = $1 ORDER BY created_at DESC`,
    [session.user.id]
  )

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">레포지토리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{repos.length}개 등록됨</p>
        </div>
        <Button asChild size="sm" className="gap-2">
          <Link href="/dashboard/repositories">
            <Plus className="w-4 h-4" />
            레포지토리 관리
          </Link>
        </Button>
      </div>

      {/* 빈 상태 */}
      {repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-gray-700">등록된 레포지토리가 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Git 또는 SVN 레포지토리를 추가해보세요.
          </p>
          <Button asChild size="sm" className="gap-2">
            <Link href="/dashboard/repositories">
              <Plus className="w-4 h-4" />
              레포지토리 추가
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {repos.map((repo) => (
            <Link
              key={repo.id}
              href={`/dashboard/repositories/${repo.id}/logs`}
              className="group bg-white rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-md transition-all"
            >
              {/* 아이콘 + 배지 */}
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  repo.vcs_type === 'git' ? 'bg-orange-50 text-orange-500' : 'bg-purple-50 text-purple-500'
                }`}>
                  {repo.vcs_type === 'git' ? <GitIcon /> : <SvnIcon />}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {repo.vcs_type.toUpperCase()}
                </Badge>
              </div>

              {/* 이름 & URL */}
              <p className="font-semibold text-gray-800 group-hover:text-primary transition-colors">
                {repo.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1 truncate">{repo.url}</p>

              {/* 하단 */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  {new Date(repo.created_at).toLocaleDateString('ko-KR')}
                </span>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                  로그 보기 →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
