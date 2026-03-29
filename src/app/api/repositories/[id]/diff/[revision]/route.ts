import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; revision: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, revision } = await params
  const repo = await getRepository(Number(id), Number(session.user.id))
  if (!repo) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const provider = createVcsProvider(repo)
  const diffs = await provider.getDiff(revision)

  return NextResponse.json(diffs)
}
