'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { ChevronDown, ChevronRight, Plus, LayoutDashboard, FolderGit2, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Repository {
  id: number
  name: string
  vcs_type: 'git' | 'svn'
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [repoOpen, setRepoOpen] = useState(true)
  const [repos, setRepos] = useState<Repository[]>([])
  const pathname = usePathname()

  useEffect(() => {
    fetch('/api/repositories')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setRepos(data))
      .catch(() => {})
  }, [pathname]) // 페이지 이동할 때마다 갱신

  const isDashboard = pathname === '/dashboard'
  const activeRepoId = pathname.match(/\/repositories\/(\d+)/)?.[1]

  return (
    <aside className={cn(
      'flex flex-col bg-gray-900 text-white transition-all duration-200 shrink-0',
      collapsed ? 'w-14' : 'w-56'
    )}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 h-14 border-b border-gray-700 shrink-0">
        {!collapsed && <span className="text-sm font-semibold truncate">Code Reviewer</span>}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
          title={collapsed ? '펼치기' : '접기'}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <PanelLeftClose className="w-4 h-4" />
          }
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-1">

        {/* 대시보드 */}
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors',
            isDashboard ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
          )}
          title={collapsed ? '대시보드' : undefined}
        >
          <LayoutDashboard className="w-5 h-5 shrink-0" />
          {!collapsed && <span>대시보드</span>}
        </Link>

        {/* 레포지토리 섹션 */}
        <div>
          <div className={cn(
            'flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-gray-400',
            !collapsed && 'cursor-pointer hover:bg-gray-800 hover:text-white transition-colors'
          )}
            onClick={() => !collapsed && setRepoOpen(!repoOpen)}
            title={collapsed ? '레포지토리' : undefined}
          >
            <FolderGit2 className="w-5 h-5 shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">레포지토리</span>
                <div className="flex items-center gap-1">
                  <Link
                    href="/dashboard/repositories"
                    onClick={(e) => e.stopPropagation()}
                    className="p-0.5 rounded hover:bg-gray-700 hover:text-white"
                    title="레포지토리 관리"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                  {repoOpen
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </div>
              </>
            )}
          </div>

          {/* 레포 목록 */}
          {!collapsed && repoOpen && (
            <div className="mt-1 ml-2 pl-3 border-l border-gray-700 space-y-0.5">
              {repos.length === 0 ? (
                <p className="text-xs text-gray-600 py-1 px-2">등록된 레포 없음</p>
              ) : (
                repos.map((repo) => {
                  const active = activeRepoId === String(repo.id)
                  return (
                    <Link
                      key={repo.id}
                      href={`/dashboard/repositories/${repo.id}/logs`}
                      className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors truncate',
                        active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <span className={cn(
                        'text-[10px] font-bold shrink-0',
                        repo.vcs_type === 'git' ? 'text-orange-400' : 'text-purple-400'
                      )}>
                        {repo.vcs_type.toUpperCase()}
                      </span>
                      <span className="truncate">{repo.name}</span>
                    </Link>
                  )
                })
              )}
            </div>
          )}
        </div>
      </nav>

      {/* 로그아웃 */}
      <div className="px-2 py-3 border-t border-gray-700">
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          title={collapsed ? '로그아웃' : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>로그아웃</span>}
        </button>
      </div>
    </aside>
  )
}
