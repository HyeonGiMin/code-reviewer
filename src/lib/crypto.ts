import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // GCM 권장값
const TAG_LENGTH = 16

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('ENCRYPTION_KEY 환경변수가 없거나 올바르지 않습니다. (openssl rand -hex 32)')
  }
  return Buffer.from(hex, 'hex')
}

/**
 * 평문을 AES-256-GCM으로 암호화
 * 반환 형식: iv(24):tag(32):ciphertext(hex) — 콜론 구분
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * encrypt() 결과를 복호화
 */
export function decrypt(ciphertext: string): string {
  const parts = ciphertext.split(':')
  if (parts.length !== 3) throw new Error('잘못된 암호화 형식입니다.')

  const [ivHex, tagHex, dataHex] = parts
  const key = getKey()
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex').slice(0, TAG_LENGTH))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}
