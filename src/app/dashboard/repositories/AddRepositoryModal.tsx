'use client'

import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'

interface Props {
  onClose: () => void
  onAdded: () => void
}

const VCS_OPTIONS = [
  {
    type: 'git' as const,
    label: 'Git',
    description: 'GitHub, GitLab, Gitea 등',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M23.546 10.93L13.067.452a1.55 1.55 0 00-2.188 0L8.708 2.627l2.76 2.76a1.838 1.838 0 012.327 2.341l2.658 2.66a1.838 1.838 0 11-1.1 1.1l-2.48-2.48v6.521a1.84 1.84 0 11-1.512-.036V9.003a1.839 1.839 0 01-1-2.426L7.617 3.82.454 10.93a1.55 1.55 0 000 2.19l10.48 10.477a1.55 1.55 0 002.186 0l10.426-10.478a1.55 1.55 0 000-2.188" />
      </svg>
    ),
    activeColor: 'border-orange-500 bg-orange-50 text-orange-600',
    iconColor: 'text-orange-500',
  },
  {
    type: 'svn' as const,
    label: 'SVN',
    description: 'Apache Subversion',
    icon: (
      <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
        <path d="M3 3h18v2H3V3zm0 8h18v2H3v-2zm0 8h18v2H3v-2zm3-4h6v2H6v-2zm0-8h6v2H6V7z"/>
      </svg>
    ),
    activeColor: 'border-purple-500 bg-purple-50 text-purple-600',
    iconColor: 'text-purple-500',
  },
]

export default function AddRepositoryModal({ onClose, onAdded }: Props) {
  const [form, setForm] = useState({
    name: '',
    vcsType: 'git' as 'git' | 'svn',
    url: '',
    httpUsername: '',
    httpPassword: '',
  })
  const [authOpen, setAuthOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/repositories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          vcsType: form.vcsType,
          url: form.url,
          httpUsername: form.httpUsername || undefined,
          httpPassword: form.httpPassword || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '저장 중 오류가 발생했습니다.')
        return
      }
      onAdded()
    } finally {
      setLoading(false)
    }
  }

  const selected = VCS_OPTIONS.find((o) => o.type === form.vcsType)!

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-white" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-gray-900">레포지토리 추가</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">

          {/* VCS 타입 카드 */}
          <div className="space-y-2">
            <Label className="text-gray-700">VCS 타입</Label>
            <div className="grid grid-cols-2 gap-3">
              {VCS_OPTIONS.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setForm({ ...form, vcsType: opt.type })}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                    form.vcsType === opt.type
                      ? opt.activeColor
                      : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  <span className={form.vcsType === opt.type ? opt.iconColor : 'text-gray-400'}>
                    {opt.icon}
                  </span>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{opt.label}</p>
                    <p className="text-xs opacity-60 mt-0.5">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 이름 */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-gray-700">이름</Label>
            <Input
              id="name"
              required
              placeholder="내 레포지토리"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="text-gray-900"
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label htmlFor="url" className="text-gray-700">URL</Label>
            <Input
              id="url"
              type="url"
              required
              placeholder={
                form.vcsType === 'git'
                  ? 'https://github.com/user/repo.git'
                  : 'http://svn.example.com/repo'
              }
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="text-gray-900"
            />
          </div>

          {/* 인증 정보 (접이식) */}
          <Collapsible open={authOpen} onOpenChange={setAuthOpen}>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-gray-400" />
                  HTTP 인증
                  <span className="text-xs text-gray-400">
                    {form.vcsType === 'git' ? '(PAT)' : '(계정 정보)'} — 선택 사항
                  </span>
                </span>
                <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform duration-200', authOpen && 'rotate-180')} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-3 px-1">
              <div className="space-y-1.5">
                <Label htmlFor="httpUsername" className="text-gray-700">Username</Label>
                <Input
                  id="httpUsername"
                  placeholder={form.vcsType === 'git' ? 'GitHub 계정 ID' : 'SVN 계정 ID'}
                  value={form.httpUsername}
                  onChange={(e) => setForm({ ...form, httpUsername: e.target.value })}
                  className="text-gray-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="httpPassword" className="text-gray-700">
                  {form.vcsType === 'git' ? 'Personal Access Token' : 'Password'}
                </Label>
                <Input
                  id="httpPassword"
                  type="password"
                  placeholder={form.vcsType === 'git' ? 'ghp_xxxxxxxxxxxx' : '비밀번호'}
                  value={form.httpPassword}
                  onChange={(e) => setForm({ ...form, httpPassword: e.target.value })}
                  className="text-gray-900"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1 text-gray-700" onClick={onClose}>
              취소
            </Button>
            <Button
              type="submit"
              className={cn('flex-1', selected.type === 'git' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-purple-600 hover:bg-purple-700')}
              disabled={loading}
            >
              {loading ? '저장 중...' : '추가'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
