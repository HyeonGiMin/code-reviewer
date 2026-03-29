import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/postgres'

export async function POST(req: NextRequest) {
  const { email, name, password } = await req.json()

  if (!email || !name || !password) {
    return NextResponse.json({ error: '모든 항목을 입력해주세요.' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: '비밀번호는 8자 이상이어야 합니다.' }, { status: 400 })
  }

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: '이미 사용 중인 이메일입니다.' }, { status: 409 })
  }

  const hashed = await bcrypt.hash(password, 12)
  const { rows } = await pool.query(
    'INSERT INTO users (email, name, password) VALUES ($1, $2, $3) RETURNING id, email, name',
    [email, name, hashed]
  )

  return NextResponse.json(rows[0], { status: 201 })
}
