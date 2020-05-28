import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import fs from 'fs'
import path from 'path'

import fetch from 'node-fetch';
(global as any).fetch = fetch;

async function main() {
  const repoPath = path.join(__dirname, 'isogit-clone')

  // Remove repo directory
  await fs.promises.rmdir(repoPath, {recursive: true})
  console.log('repo directory removed');


  // Clone from git http backend (should be running via ts-node ./PolykeyBackend.ts)
  await git.clone({
    fs: fs,
    http: http,
    dir: repoPath,
    url: 'http://localhost:7005/GitRepo'
  })
  console.log('clone complete');

}

main()
