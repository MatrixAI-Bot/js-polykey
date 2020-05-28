import git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'
import fs from 'fs'
import path from 'path'

import fetch from 'node-fetch';
(global as any).fetch = fetch;

async function main() {
  const repoPath = path.join(__dirname, 'isogit-clone')
  const remoteUrl = 'http://localhost:7005/GitRepo'

  // Remove repo directory
  await fs.promises.rmdir(repoPath, {recursive: true})
  console.log('repo directory removed');

  // Get remote info
  const remoteInfo = await git.getRemoteInfo({
    http: http,
    url: remoteUrl
  })
  console.log('Remote refs:');
  console.log(remoteInfo.refs);


  // Clone from git http backend (should be running via ts-node ./PolykeyBackend.ts)
  await git.clone({
    fs: fs,
    http: http,
    dir: repoPath,
    url: remoteUrl,
    // onProgress: (progress) => {
    //   if (progress.total) {
    //     console.log(`${progress.phase}: ${progress.loaded}/${progress.total}`);
    //   } else {
    //     console.log(`${progress.phase}: ${progress.loaded}`);
    //   }
    // }
  })
  console.log('clone complete');

}

main()
