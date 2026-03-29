'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export default function SignUpPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', name: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password !== form.confirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, name: form.name, password: form.password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '회원가입 중 오류가 발생했습니다.')
        return
      }
      setDone(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">회원가입</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                type="text"
                required
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                required
                placeholder="8자 이상"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm">비밀번호 확인</Label>
              <Input
                id="confirm"
                type="password"
                required
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? '처리 중...' : '회원가입'}
            </Button>
          </form>

          <p className="mt-4 text-sm text-center text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardContent>
      </Card>

      <Dialog open={done} onOpenChange={(open) => !open && router.push('/auth/signin')}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>회원가입 완료</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">회원가입이 완료되었습니다.</p>
          <DialogFooter>
            <Button className="w-full" onClick={() => router.push('/auth/signin')}>
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
