import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectMongoDB from '@/lib/mongodb'
import Review from '@/models/Review'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; revision: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, revision } = await params

  try {
    await connectMongoDB()
  } catch (err) {
    console.warn('[Reviews GET] MongoDB unavailable:', err)
    return NextResponse.json({ comments: [] })
  }

  // 요구사항: 향후 다중 사용자 보기를 확장하더라도 현재는 내(자신) 것만 보임
  let review = null
  try {
    review = await Review.findOne({
      repositoryId: Number(id),
      revision,
      userId: Number(session.user.id),
    }).lean()
  } catch (err) {
    console.warn('[Reviews GET] Failed to fetch review:', err)
  }

  return NextResponse.json(review || { comments: [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; revision: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, revision } = await params

  let filePath: string | undefined, body: string
  try {
    ({ filePath, body } = await req.json())
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 })
  }
  if (typeof body !== 'string') {
    return NextResponse.json({ error: 'body 필드가 필요합니다.' }, { status: 400 })
  }

  // body가 빈 문자열 이면 삭제, 아니면 업데이트/추가 하는 로직
  try {
    await connectMongoDB()
  } catch (err) {
    console.warn('[Reviews POST] MongoDB unavailable:', err)
    return NextResponse.json({ error: '저장소에 연결할 수 없습니다.' }, { status: 503 })
  }

  let reviewDoc = null
  try {
    reviewDoc = await Review.findOne({
      repositoryId: Number(id),
      revision,
      userId: Number(session.user.id),
    })
  } catch (err) {
    console.warn('[Reviews POST] Failed to fetch review:', err)
    return NextResponse.json({ error: '저장소에서 데이터를 가져올 수 없습니다.' }, { status: 503 })
  }

  let comments = reviewDoc ? reviewDoc.comments : []

  const norm = (v: string | undefined | null) => v || null
  if (!body || body.trim() === '') {
    // 삭제
    comments = comments.filter(c => norm(c.filePath) !== norm(filePath))
  } else {
    // 추가 거나 수정
    const existingIdx = comments.findIndex(c => norm(c.filePath) === norm(filePath))
    if (existingIdx !== -1) {
      comments[existingIdx].body = body
      comments[existingIdx].createdAt = new Date()
    } else {
      comments.push({ filePath, body, createdAt: new Date() })
    }
  }

  try {
    const updated = await Review.findOneAndUpdate(
      { repositoryId: Number(id), revision, userId: Number(session.user.id) },
      { $set: { comments } },
      { new: true, upsert: true }
    ).lean()
    return NextResponse.json(updated)
  } catch (err) {
    console.error('[Reviews POST] Failed to save review:', err)
    return NextResponse.json({ error: '코멘트를 저장할 수 없습니다.' }, { status: 503 })
  }
}
