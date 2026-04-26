import mongoose, { Schema, Document } from 'mongoose'
import type { ReviewComment } from '@/types'

export interface IReview extends Document {
  repositoryId: number
  revision: string
  userId: number
  comments: ReviewComment[]
  createdAt: Date
  updatedAt: Date
}

const ReviewCommentSchema = new Schema<ReviewComment>({
  filePath: { type: String, required: false },
  body: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false }) // _id를 안 줘서 객체 용량을 줄임

const ReviewSchema = new Schema<IReview>({
  repositoryId: { type: Number, required: true },
  revision: { type: String, required: true },
  userId: { type: Number, required: true }, // 사용자별 코멘트를 구분
  comments: { type: [ReviewCommentSchema], default: [] },
}, { timestamps: true })

// 본인의 리뷰를 빠르게 찾기 위한 인덱스
ReviewSchema.index({ repositoryId: 1, revision: 1, userId: 1 }, { unique: true })

export default mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema)
