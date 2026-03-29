import type { Repository } from '@/types'
import type { VcsProvider } from './types'
import { GitProvider } from './git'
import { SvnProvider } from './svn'

export function createVcsProvider(repo: Repository): VcsProvider {
  const auth = repo.httpPassword
    ? { username: repo.httpUsername, token: repo.httpPassword }
    : undefined

  if (repo.vcsType === 'git') {
    return new GitProvider(repo.url, auth)
  }
  return new SvnProvider(repo.url, auth)
}

export type { VcsProvider }
