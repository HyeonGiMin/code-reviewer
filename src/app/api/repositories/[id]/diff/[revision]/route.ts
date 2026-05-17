import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getRepository } from '@/lib/repositories'
import { createVcsProvider } from '@/lib/vcs'
import connectMongoDB from '@/lib/mongodb'
import CachedDiff from '@/models/CachedDiff'

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

  // 1. MongoDB 캐시 확인 (연결 실패 시 캐시 없이 진행)
  let cached = null
  try {
    await connectMongoDB()
    cached = await CachedDiff.findOne({ repositoryId: Number(id), revision }).lean()
  } catch (err) {
    console.warn(`[Cache] MongoDB unavailable, skipping cache lookup:`, err)
  }

  if (cached && Array.isArray(cached.diffData) && cached.diffData.length > 0) {
    console.log(`[Cache Hit] Diff for repo ${id}, rev ${revision} from MongoDB`)
    return NextResponse.json(cached.diffData)
  }

  // 빈 배열로 캐시된 경우 삭제 후 재계산
  if (cached) {
    try {
      await CachedDiff.deleteOne({ repositoryId: Number(id), revision })
    } catch { /* ignore */ }
  }

  // 2. 캐시 미스 시, VCS 플러그인을 통한 파싱 수행
  console.log(`[Cache Miss] Fetching diff from VCS for repo ${id}, rev ${revision}`)
  const provider = createVcsProvider(repo)
  let diffs
  try {
    diffs = await provider.getDiff(revision)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[Diff] repo=${id} rev=${revision} error:`, message)
    return NextResponse.json({ error: message }, { status: 500 })
  }

  // 3. 파싱 완료된 결과물을 MongoDB에 캐싱 (연결 실패 시 재시도 후 저장)
  try {
    await connectMongoDB()
    await CachedDiff.create({ repositoryId: Number(id), revision, diffData: diffs })
  } catch (err) {
    console.error('Failed to cache diff:', err)
  }

  return NextResponse.json(diffs)
}
