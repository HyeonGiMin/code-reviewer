import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import pool from '@/lib/postgres'
import { encrypt } from '@/lib/crypto'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, name, vcs_type, url, http_username, created_at
       FROM repositories WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    )
    return NextResponse.json(rows)
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, vcsType, url, httpUsername, httpPassword } = await req.json()
    const encryptedPassword = httpPassword ? encrypt(httpPassword) : null

    const { rows } = await pool.query(
      `INSERT INTO repositories (user_id, name, vcs_type, url, http_username, http_password)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, user_id, name, vcs_type, url, http_username, created_at`,
      [session.user.id, name, vcsType, url, httpUsername ?? null, encryptedPassword]
    )
    return NextResponse.json(rows[0], { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
