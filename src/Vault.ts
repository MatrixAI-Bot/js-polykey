// $FlowFixMe
import hkdf from 'futoin-hkdf'
// $FlowFixMe
import EFS from '../encryptedfs-tmp/EncryptedFS'
import Path from 'path'
import { GeneralFileSystem } from './Polykey'

const vfs = require('virtualfs')

export default class Vault {

  _key: Buffer
  _keyLen: number
  _name: string
  _fs: GeneralFileSystem
  _secrets: Map<string, any>
  _vaultPath: string
  constructor(
    name: string,
    symKey: Buffer,
    baseDir: string,
    fileSystem: GeneralFileSystem
  ) {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair
    const vfsInstance = new vfs.VirtualFS
    this._keyLen = 32
    this._key = this._genSymKey(symKey, this._keyLen)
    this._fs = fileSystem
    this._name = name
    this._vaultPath = Path.join(baseDir, name)
    this._secrets = new Map()

    this._loadSecrets()
  }

  _loadSecrets() {
    const secrets = this._fs.readdirSync(this._vaultPath, undefined)
    for (const secret of secrets) {
      this._secrets.set(secret, null)
    }
  }

  _genSymKey(asymKey: Buffer, keyLen: number): Buffer {
    return hkdf(asymKey, keyLen)
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
        const secretBuf = this._fs.readFileSync(secretPath, undefined)
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

  listSecrets (): string[] {
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
