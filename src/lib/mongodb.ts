import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다.')
}

// Next.js dev 환경에서 hot reload 시 중복 연결 방지
declare global {
  // eslint-disable-next-line no-var
  var _mongooseConn: typeof mongoose | null
}

let cached = global._mongooseConn

async function connectMongoDB() {
  if (cached) return cached

  cached = await mongoose.connect(MONGODB_URI)
  global._mongooseConn = cached
  return cached
}

export default connectMongoDB
