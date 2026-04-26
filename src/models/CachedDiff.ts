import mongoose, { Schema, Document } from 'mongoose'
import type { FileDiff } from '@/types'

export interface ICachedDiff extends Document {
  repositoryId: number
  revision: string
  diffData: FileDiff[]
  createdAt: Date
}

const CachedDiffSchema = new Schema<ICachedDiff>({
  repositoryId: { type: Number, required: true },
  revision: { type: String, required: true },
  // FileDiff 배열을 Mixed(JSON) 형태로 저장하여 유연하게 대응
  diffData: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
})

// 특정 레포의 특정 리비전을 빠르게 찾을 수 있도록 복합키(Unique) 설정
CachedDiffSchema.index({ repositoryId: 1, revision: 1 }, { unique: true })

export default mongoose.models.CachedDiff || mongoose.model<ICachedDiff>('CachedDiff', CachedDiffSchema)
