import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import connectMongoDB from '@/lib/mongodb'
import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema({
  repositoryId: { type: Number, required: true },
  revision: { type: String, required: true },
  userId: { type: Number, required: true },
  comments: [
    {
      filePath: { type: String },
      body: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true })

const Review = mongoose.models.Review ?? mongoose.model('Review', reviewSchema)

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const repositoryId = searchParams.get('repositoryId')
  const revision = searchParams.get('revision')

  await connectMongoDB()
  const reviews = await Review.find({ repositoryId, revision })
  return NextResponse.json(reviews)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  await connectMongoDB()

  const review = await Review.create({
    ...body,
    userId: Number(session.user.id),
  })
  return NextResponse.json(review, { status: 201 })
}
