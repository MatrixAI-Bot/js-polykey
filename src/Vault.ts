// $FlowFixMe
import hkdf from 'futoin-hkdf'
// $FlowFixMe
import Path from 'path'
import { EncryptedFS } from 'js-encryptedfs'
import { Git } from './git-server/git'
import fs from 'fs'
import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'

const vfs = require('virtualfs')

import Multiaddr from 'multiaddr'
import { efsCallbackWrapper, GitFS } from './util'

export default class Vault {

  _key: Buffer
  _keyLen: number
  _name: string
  _fs: EncryptedFS
  _secrets: Map<string, any>
  _vaultPath: string
  constructor(
    name: string,
    symKey: Buffer,
    baseDir: string
  ) {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair
    this._keyLen = 32
    this._key = this._genSymKey(symKey, this._keyLen)
    // Set filesystem
    const vfsInstance = new vfs.VirtualFS

    this._fs = new EncryptedFS(
      symKey,
      vfsInstance,
      vfsInstance,
      fs,
      process
    )

    this._name = name
    this._vaultPath = Path.join(baseDir, name)
    // make the vault directory
    this._fs.mkdirSync(this._vaultPath, {recursive: true})
    this._secrets = new Map()

    this._loadSecrets()

    // initialize the vault as a git repo
    this.initRepository()
  }

  _loadSecrets() {
    const secrets = this._fs.readdirSync(this._vaultPath, undefined)
    for (const secret of secrets) {
      this._secrets.set(secret, null)
    }
  }

  _genSymKey(asymKey: Buffer, keyLen: number): Buffer {
    return Buffer.from(hkdf(asymKey.toString(), keyLen))
  }

  _secretExists(secretName: string) : boolean {
    const secretPath = Path.join(this._vaultPath, secretName)
    return this._secrets.has(secretName) && this._fs.existsSync(secretPath)
  }

  addSecret (secretName: string, secretBuf: Buffer): void {
    // TODO: check if secret already exists
    const writePath = Path.join(this._vaultPath, secretName)
    // TODO: use aysnc methods
    const fd = this._fs.openSync(writePath, 'w')
    this._fs.writeSync(fd, secretBuf, 0, secretBuf.length, 0)
    this._secrets.set(secretName, secretBuf)
    // TODO: close file or use write file sync
  }

  getSecret(secretName: string): Buffer | string {
    if (this._secrets.has(secretName)) {
      const secret = this._secrets.get(secretName)
      if (secret) {
        return secret
      } else {
        const secretPath = Path.join(this._vaultPath, secretName)
        // TODO: this should be async
        const secretBuf = this._fs.readFileSync(secretPath, {})
        this._secrets.set(secretName, secretBuf)
        return secretBuf
      }
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  removeSecret (secretName: string): void {
    if (this._secrets.has(secretName)) {
      const successful = this._secrets.delete(secretName)
      if (successful) {
        return
      }
      throw Error('Secret: ' + secretName + ' was not removed')
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  listSecrets(): string[] {
    let secrets: string[] = Array.from(this._secrets.keys())
    return secrets
  }

  tagVault() {

  }

  untagVault() {

  }

  // async makeCommitMsg(filepath: string, hotFiles: string[]) {
  //   // TODO: join dir + filename
  //   let status = await git.status({ fs: this._fs, dir: this._vaultPath, filepath: filepath })

  //   let commitMsg = ''
  //   commitMsg.concat(status + ' ' + filepath + '\n')
  //   // events.push('remove file')
  //   //		events.push('added file: ' + filename)
  // }

  // async transaction(callback) {
  //   const events = []
  //   const filename =  'example.txt'
  //   const data = 'write operation'
  //   const dir = '.'
  //   let hotFiles = new Set()
  //   let commitMsg = ""

  //   // TODO: check if git repo, init otherwise
  //   await this.initRepository()

  //   // do vfs operations
  //   await callback(fs)

  //   // check what's changes
  //   await hotFiles.array.forEach(element => {

  //   });(await this.makeCommitMsg())

  //   console.log(commitMsg)


  //   /*	let status = await git.status({ dir: '.', filepath: 'example.txt'})
  //     console.log(status)
  //   */
  //   //---------------------


  //   console.log('Making commit' + '\n')
  //   // var commit_msg = events.join('\n')
  //   var commit_msg = ''
  //   let sha = await git.commit({
  //     fs: this._fs,
  //     dir: this._vaultPath,
  //     author: {
  //       name: 'Mr. Test',
  //       email: 'mrtest@example.com'
  //     },
  //     message: commit_msg
  //   })
  //   console.log('SHA of commit:\n' + sha + '\n')

  //   console.log('git log:')
  //   let commits = await git.log({ fs: this._fs, dir: this._vaultPath, depth: 5, ref: 'master' })
  //   console.log(commits)

  //   sha = await git.resolveRef({ fs: this._fs, dir: this._vaultPath, ref: 'master' })
  //   console.log(sha)
  //   var { object: blob } = await git.readObject({
  //     fs: this._fs,
  //     dir: this._vaultPath,
  //     oid: sha,
  //     filepath: filename,
  //     encoding: 'utf8'
  //   })
  //   console.log(blob)



  //   this.transaction(async  (fs) => {
  //     console.log('files in dir')
  //     let files = await vfs.readdirSync(dir)
  //     console.log(files)

  //     console.log('Writing file in vfs')
  //     await fs.writeFile(filename, data, 'utf8')

  //     console.log('files in dir')
  //     files = vfs.readdirSync(dir)
  //     console.log(files)

  //     //fs.addFile()
  //     // fs.removeFile()
  //   })
  // }



  // async commitEverything() {
  // 	// TODO: identity
  // 	// make an empty/dummy commit so we can have a valid master ref
  // 	// and so we an can use git status to formulate commit messages
  // 	var msg = 'repo init commit'
  // 	let sha = await git.commit({
  //     fs: this._fs,
  // 		dir: this._vaultPath,
  // 		author: {
  // 			name: 'Mr. Test',
  // 			email: 'mrtest@example.com'
  // 		},
  // 		message: msg
  // 	})
  // 	console.log('SHA of commit:\n' + sha + '\n')
  // }

  async initRepository() {
    await git.init({fs: efsCallbackWrapper(this._fs), dir: this._vaultPath})
  }

  shareVault(): string {
    const vaultParentDir = Path.dirname(this._vaultPath)

    git.init({fs: efsCallbackWrapper(this._fs), dir: Path.join(this._vaultPath, 'gitrepo')})

    const repos = new Git(vaultParentDir, this._fs, {
      autoCreate: false
    });
    const port = 7005;

    repos.on('push', (push) => {
        console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
        push.accept();
    });

    repos.on('fetch', (fetch) => {
      console.log(`fetch ${fetch.commit}`);
      fetch.accept();
    });

    repos.listen(port, null, () => {
        console.log(`node-git-server running at http://localhost:${port}`)
    })

    return `/ip4/127.0.0.1/tcp/${port}`
  }

  unshareVault(addr: string) {
  }


  async addPeer(addr: string) {
    const multiaddr = new Multiaddr(addr)
    const nodeAddr = multiaddr.nodeAddress()

    await git.addRemote({
      fs,
      dir: this._vaultPath,
      remote: 'master',
      url: `http://${nodeAddr.address}:${nodeAddr.port}/${this._vaultPath}}`
    })
  }

  async pullVault() {
    await git.pull({
      fs: this._fs,
      http: http,
      dir: this._vaultPath,
      ref: 'master',
      singleBranch: true
    })
  }

  // ============== Helper methods ============== //

}
