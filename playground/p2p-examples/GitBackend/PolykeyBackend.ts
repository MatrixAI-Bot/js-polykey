const path = require('path');
import GitServer from '../../../src/git-server/GitServer'
import VaultStore from '../../../src/VaultStore/VaultStore'
import git from 'isomorphic-git'
import fs from 'fs'

const vaultStore = new VaultStore()

const repos = new GitServer(path.resolve(__dirname, 'tmp'), vaultStore);

const port = 7005;

repos.listen(port);

// git.packObjects({
//   fs: fs,
//   dir: path.resolve(__dirname, 'tmp', 'GitRepo'),
//   oids: ['26b626543b7b4dbd180bc08167f81a6a009584f2']
// }).then((packfile) => {
//   console.log(packfile);

// })
