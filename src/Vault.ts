// $FlowFixMe
import hkdf from 'futoin-hkdf'
// $FlowFixMe
import Path from 'path'
import { EncryptedFS } from 'js-encryptedfs'
import { Buffer } from 'buffer/'
import fs from 'fs'
import * as git from 'isomorphic-git'


const vfs = require('virtualfs')

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
    git.init({fs: this._fs, dir: this._vaultPath})
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

  tagVault () {

  }

  untagVault () {

  }

  shareVault () {

  }

  unshareVault () {

  }


}
