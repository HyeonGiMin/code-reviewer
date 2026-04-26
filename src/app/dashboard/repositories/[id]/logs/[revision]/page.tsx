import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'
import type { CommitLog } from '@/types'
import ReviewClient from './ReviewClient'

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string; revision: string }>
}) {
  const { id, revision } = await params
  const session = await auth()
  if (!session?.user) redirect('/auth/signin')

  const repo = await getRepository(Number(id), Number(session.user.id))
  if (!repo) redirect('/dashboard')

  // 커밋 정보 조회
  let commit: CommitLog = { revision, author: '', message: '', date: new Date().toISOString(), changedPaths: [] }
  try {
    const provider = createVcsProvider(repo)
    const found = await provider.getCommit(revision)
    if (found) commit = found
  } catch {
    // 커밋 정보 조회 실패 시 기본값 사용
  }

  return <ReviewClient repoId={id} commit={commit} />
}
