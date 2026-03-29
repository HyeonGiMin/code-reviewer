import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const repo = await getRepository(Number(id), Number(session.user.id))
  if (!repo) {
    return NextResponse.json({ error: 'Repository not found' }, { status: 404 })
  }

  const limit = Number(req.nextUrl.searchParams.get('limit') ?? '30')
  const provider = createVcsProvider(repo)
  const logs = await provider.getLogs(limit)

  return NextResponse.json(logs)
}
