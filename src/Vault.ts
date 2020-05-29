// $FlowFixMe
import hkdf from 'futoin-hkdf'
// $FlowFixMe
import Path from 'path'
import { EncryptedFS } from 'encryptedfs'
import fs from 'fs'
import * as git from 'isomorphic-git'
import http from 'isomorphic-git/http/web'

const vfs = require('virtualfs')

import Multiaddr from 'multiaddr'
import { efsCallbackWrapper, GitFS } from './util'

export default class Vault {

  key: Buffer
  keyLen: number
  name: string
  efs: EncryptedFS
  secrets: Map<string, any>
  vaultPath: string
  constructor(
    name: string,
    symKey: Buffer,
    baseDir: string
  ) {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair
    this.keyLen = 32
    this.key = this._genSymKey(symKey, this.keyLen)
    // Set filesystem
    const vfsInstance = new vfs.VirtualFS

    this.efs = new EncryptedFS(
      symKey,
      vfsInstance,
      vfsInstance,
      fs,
      process
    )

    this.name = name
    this.vaultPath = Path.join(baseDir, name)
    // make the vault directory
    this.efs.mkdirSync(this.vaultPath, {recursive: true})
    this.secrets = new Map()

    this._loadSecrets()

    // initialize the vault as a git repo
    this.initRepository()
  }

  _loadSecrets() {
    const secrets = this.efs.readdirSync(this.vaultPath, undefined)
    for (const secret of secrets) {
      this.secrets.set(secret, null)
    }
  }

  _genSymKey(asymKey: Buffer, keyLen: number): Buffer {
    return Buffer.from(hkdf(asymKey.toString(), keyLen))
  }

  _secretExists(secretName: string) : boolean {
    const secretPath = Path.join(this.vaultPath, secretName)
    return this.secrets.has(secretName) && this.efs.existsSync(secretPath)
  }

  addSecret (secretName: string, secretBuf: Buffer): void {
    // TODO: check if secret already exists
    const writePath = Path.join(this.vaultPath, secretName)
    // TODO: use aysnc methods
    const fd = this.efs.openSync(writePath, 'w')
    this.efs.writeSync(fd, secretBuf, 0, secretBuf.length, 0)
    this.secrets.set(secretName, secretBuf)
    // TODO: close file or use write file sync
  }

  getSecret(secretName: string): Buffer | string {
    if (this.secrets.has(secretName)) {
      const secret = this.secrets.get(secretName)
      if (secret) {
        return secret
      } else {
        const secretPath = Path.join(this.vaultPath, secretName)
        // TODO: this should be async
        const secretBuf = this.efs.readFileSync(secretPath, {})
        this.secrets.set(secretName, secretBuf)
        return secretBuf
      }
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  removeSecret (secretName: string): void {
    if (this.secrets.has(secretName)) {
      const successful = this.secrets.delete(secretName)
      if (successful) {
        return
      }
      throw Error('Secret: ' + secretName + ' was not removed')
    }
    throw Error('Secret: ' + secretName + ' does not exist')
  }

  listSecrets(): string[] {
    let secrets: string[] = Array.from(this.secrets.keys())
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
    const fileSystem = efsCallbackWrapper(this.efs)
    await git.init({
      fs: fileSystem,
      dir: this.vaultPath
    })

    // Write packed-refs file because isomorphic git goes searching for it
    // and apparently its not autogenerated
    this.efs.writeFileSync(Path.join(this.vaultPath, '.git', 'packed-refs'), '# pack-refs with: peeled fully-peeled sorted')

    console.log('making first commit');
    const filePath = Path.join(this.vaultPath, 'somefile')
    this.efs.writeFileSync(filePath, 'somefile content')



    await git.add({
      fs: fileSystem,
      dir: this.vaultPath,
      filepath: 'somefile'
    })
    // Make first commit
    await git.commit({
      fs: fileSystem,
      dir: this.vaultPath,
      message: "init commmit",
      author: {
        name: this.name
      }
    })
    console.log('done making first commit');

  }

  async addPeer(addr: string) {
    const multiaddr = new Multiaddr(addr)
    const nodeAddr = multiaddr.nodeAddress()

    await git.addRemote({
      fs,
      dir: this.vaultPath,
      remote: 'master',
      url: `http://${nodeAddr.address}:${nodeAddr.port}/${this.vaultPath}}`
    })
  }

  async pullVault() {
    await git.pull({
      fs: this.efs,
      http: http,
      dir: this.vaultPath,
      ref: 'master',
      singleBranch: true
    })
  }

  // ============== Helper methods ============== //

}
