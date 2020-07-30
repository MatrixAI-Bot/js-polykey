import os from 'os';
import fs from 'fs';
import git from 'isomorphic-git'
import { randomString } from '../../../src/lib/utils';

describe('GitBackend class', () => {
  let sourceDir: string
  let pullDir: string

  beforeEach(async () => {
    sourceDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    pullDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
    // Initialize a git repo in sourceDir
    await git.init({ fs, dir: sourceDir })
    await git.commit({ fs, dir: sourceDir, message: "init", author: { name: "jest" } })
  })

  afterEach(() => {
    fs.rmdirSync(sourceDir, { recursive: true })
    fs.rmdirSync(pullDir, { recursive: true })
  })

  test('can pull a repository', async () => {
    
  })
})
