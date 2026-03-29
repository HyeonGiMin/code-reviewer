'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import AddRepositoryModal from './AddRepositoryModal'

interface Repository {
  id: number
  name: string
  vcs_type: 'git' | 'svn'
  url: string
  http_username?: string
  created_at: string
}

export default function RepositoriesPage() {
  const [repos, setRepos] = useState<Repository[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchRepos = async () => {
    setLoading(true)
    const res = await fetch('/api/repositories')
    if (res.ok) setRepos(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchRepos() }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">레포지토리</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? '' : `${repos.length}개 등록됨`}
          </p>
        </div>
        <Button onClick={() => setShowModal(true)} size="sm" className="gap-2">
          <Plus className="w-4 h-4" />
          레포지토리 추가
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="font-medium text-gray-700">등록된 레포지토리가 없습니다</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Git 또는 SVN 레포지토리를 추가해보세요.
          </p>
          <Button onClick={() => setShowModal(true)} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            레포지토리 추가
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {repos.map((repo) => (
            <div
              key={repo.id}
              className="group bg-white rounded-xl border border-border px-5 py-4 flex items-center justify-between hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  {repo.vcs_type === 'git' ? (
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-orange-500">
                      <path d="M23.546 10.93L13.067.452a1.55 1.55 0 00-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 012.327 2.341l2.658 2.66a1.838 1.838 0 11-1.1 1.1l-2.48-2.48v6.521a1.84 1.84 0 11-1.512-.036V9.003a1.839 1.839 0 01-1-2.426L7.617 3.82 .454 10.93a1.55 1.55 0 000 2.19l10.48 10.477a1.55 1.55 0 002.186 0l10.426-10.478a1.55 1.55 0 000-2.188" />
                    </svg>
                  ) : (
                    <span className="text-xs font-bold text-purple-600">SVN</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{repo.name}</p>
                    <Badge variant="secondary" className="text-xs hidden sm:inline-flex">
                      {repo.vcs_type.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">
                    {repo.url}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                {repo.http_username && (
                  <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {repo.http_username}
                  </span>
                )}
                <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddRepositoryModal
          onClose={() => setShowModal(false)}
          onAdded={() => { setShowModal(false); fetchRepos() }}
        />
      )}
    </div>
  )
}
