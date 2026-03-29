import pool from './postgres'
import { decrypt } from './crypto'
import type { Repository } from '@/types'

export async function getRepository(id: number, userId: number): Promise<Repository | null> {
  const { rows } = await pool.query(
    `SELECT id, user_id, name, vcs_type, url, http_username, http_password, created_at
     FROM repositories
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  )
  if (!rows[0]) return null

  const row = rows[0]
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    vcsType: row.vcs_type,
    url: row.url,
    httpUsername: row.http_username,
    httpPassword: row.http_password ? decrypt(row.http_password) : undefined,
    createdAt: row.created_at,
  }
}
