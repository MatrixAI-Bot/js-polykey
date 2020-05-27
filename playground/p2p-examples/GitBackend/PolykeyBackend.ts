const path = require('path');
import GitBackend from '../../../src/version-control/git-backend/GitBackend'
import VaultStore from '../../../src/VaultStore/VaultStore'
import git from 'isomorphic-git'
import fs from 'fs'

const vaultStore = new VaultStore()

const repos = new GitBackend(path.resolve(__dirname, 'tmp'), vaultStore);

const port = 7005;

repos.on('push', (push) => {
    console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
    push.accept();
});

repos.on('fetch', (fetch) => {
    console.log(`fetch ${fetch.commit}`);
    fetch.accept();
});

repos.listen(port);

// git.packObjects({
//   fs: fs,
//   dir: path.resolve(__dirname, 'tmp', 'GitRepo'),
//   oids: ['26b626543b7b4dbd180bc08167f81a6a009584f2']
// }).then((packfile) => {
//   console.log(packfile);

// })
