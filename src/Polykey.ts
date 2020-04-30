import fs, { PathLike } from 'fs'
import Path from 'path'
import os from 'os'
import Vault from './Vault'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import _ from 'lodash'
import KeyManager from './KeyManager'
import EncryptedFS from '../encryptedfs-tmp/EncryptedFS'

type CharacterEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex' | undefined
export interface GeneralFileSystem {
  exists(path: string, callback: (exists: boolean) => void): void
  existsSync(path: string): boolean
  mkdir(path: string, options: {recursive: boolean} | undefined, callback: (err: NodeJS.ErrnoException | null, path: string) => void): void
  mkdirSync(path: string, options: {recursive: boolean} | undefined): void
  rmdirSync(path: string, options?: {recursive: boolean} | undefined): void
  readFileSync(path: string, options: {encoding?: string | undefined, flag?: string | undefined} | undefined): Buffer | string
  open(path: string, flags: string, mode: number, callback: (err: NodeJS.ErrnoException | null, fd: number | undefined) => void): void
	openSync(path: string, flags: string, mode?: number): number
	// access(path: PathLike, mode: number | undefined, callback: NoParamCallback): void
	// accessSync(path: PathLike, mode?: number | undefined): void
	// close(fd: number, callback: NoParamCallback): void
	// closeSync(fd: number): void
  // rmdirSync(path: string, options: {recursive: boolean} | undefined): void
  readdirSync(path: string, options: {encoding: CharacterEncoding, withFileTypes?: boolean} | undefined): string[]
	write(fd: number, buffer: Buffer, offset: number, length: number, position: number, callback: (err: NodeJS.ErrnoException | null, written: number, buffer: Buffer) => void): void
	writeSync(fd: number, buffer: Buffer, offset?: number, length?: number, position?: number): number
	// open(path: PathLike, flags: string | number, mode: string | number | null | undefined, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void
	// openSync(path: PathLike, flags: string | number, mode?: string | number | null | undefined): number
	// exists(path: PathLike, callback: (exists: boolean) => void): void
	// existsSync(path: PathLike): boolean
	// read<TBuffer extends NodeJS.ArrayBufferView>(fd: number, buffer: TBuffer, offset: number, length: number, position: number | null, callback: (err: NodeJS.ErrnoException | null, bytesRead: number, buffer: TBuffer) => void): void
	// readSync(fd: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position: number | null): number
	// appendFile(file: string | number | Buffer | URL, data: any, options: FileOptions, callback: NoParamCallback): void
	// appendFileSync(file: string | number | Buffer | URL, data: any, options?: string | FileOptions | null | undefined): void
	// unlink(path: PathLike, callback: NoParamCallback): void
	// unlinkSync(path: PathLike): void
	// open(path: PathLike, flags: string | number, mode: string | number | null | undefined, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void
	// openSync(path: PathLike, flags: string | number, mode?: string | number | null | undefined): number
	// readlink(path: PathLike, ...args: Array<any>): void
	// readlinkSync(path: PathLike, options?: FileOptions): string | Buffer
	// symlink(dstPath: PathLike, srcPath: PathLike, ...args: Array<any>): void
	// symlinkSync(dstPath: PathLike, srcPath: PathLike, type: "dir" | "file" | "junction" | null | undefined): void
	// link(existingPath: PathLike, newPath: PathLike, callback: NoParamCallback): void
	// linkSync(existingPath: PathLike, newPath: PathLike): void
	// fstat(fdIndex: number, callback: (err: NodeJS.ErrnoException | null, stat: Stat) => void): void
	// fstatSync(fdIndex: number): Stat
	// mkdtemp(prefix: String, options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined, callback: (err: NodeJS.ErrnoException | null, path: string | Buffer) => void): void
	// mkdtempSync(prefix: String, options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined): string | Buffer
	// chmod(path: PathLike, mode: number, callback: NoParamCallback): void
	// chmodSync(path: PathLike, mode: number): void
	// chown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void
	// chownSync(path: PathLike, uid: number, gid: number): void
	// utimes(path: PathLike, atime: number | string | Date, mtime: number | string | Date, callback: NoParamCallback): void
	// utimesSync(path: PathLike, atime: number | string | Date, mtime: number | string | Date): void
}
type Metadata = {
  [vaultName: string]: {
    key: Buffer, tags: Array<string>
  }
}

// TODO: convert sync to promises

/* const prom = {
  access: util.promisify(fs.access),
  mkdir: util.promisify(fs.mkdir)
} */
const vaultKeySize = 128/8 // in bytes
// TODO: key typescript public/private variables

export default class Polykey {
  _polykeyDirName: string
  _polykeyPath: string
  _fs: GeneralFileSystem
  _vaults:Map<string, Vault>
  _key: Buffer
  _pubKey: Buffer
  _privKey: Buffer
  _keySize: number
  _metadata: Metadata
  _metadataPath: string
  _km: KeyManager
  // KeyManager = KeyManager

  constructor(
    km: KeyManager,
    key: Buffer | string,
    keyLen: number = 32,
    homeDir: string = os.homedir(),
    fileSystem: GeneralFileSystem | undefined = undefined
  ) {
    this._km = km
    homeDir = homeDir || os.homedir()
    this._polykeyDirName = '.polykey'
    this._polykeyPath = Path.join(homeDir, this._polykeyDirName)
    this._metadataPath = Path.join(this._polykeyPath, 'metadata')
    // Load keys
    if (typeof key === 'string') {
      this._key = this._loadKey(key!)
    } else {
      this._key = key
    }
    // Set file system
    if (fileSystem !== undefined) {
      this._fs = fileSystem
    } else {
      const vfsInstance = new (require('virtualfs')).VirtualFS
      this._fs = new EncryptedFS(
        this._key,
        vfsInstance,
        vfsInstance,
        fs,
        process
      )
    }
    // Initialize reamining members
    this._vaults = new Map()
    this._keySize = keyLen
    this._metadata = {}
    // sync with polykey directory
    this._initSync()
  }

  static get KeyManager() {
    return KeyManager
  }
  async _fileExists(path: string): Promise<boolean> {
    return this._fs.existsSync(path)
/*     try {
      await this._fs.access(path)
    } catch(e) {
      // access errors if file doesn't exist
      return false
    }
    return true */
  }
  _fileExistsSync(path: string): boolean {
    return this._fs.existsSync(path)
  }

  /////////////
  // Secrets //
  /////////////
  async secretExists(vaultName: string, secretName: string): Promise<boolean> {
    const vault = await this._getVault(vaultName)
    const secretExists = vault._secretExists(secretName)

    return secretExists
  }

  async addSecret(vaultName: string, secretName: string, secret: Buffer): Promise<void> {
    let vault: Vault
    try {
      vault = await this._getVault(vaultName)
    } catch(err) {
      throw err
    }

    vault.addSecret(secretName, secret)
  }

  async getSecret(vaultName: string, secretName: string): Promise<Buffer | string> {
    let vault: Vault
    let secret: string | Buffer
    try {
      vault = await this._getVault(vaultName)
      secret = vault.getSecret(secretName)
    } catch(err) {
      throw err
    }
    return secret
  }

  async copySecret(vaultName: string, secretName: string): Promise<Buffer | string> {
    let vault: Vault
    let secret: string | Buffer
    try {
      vault = await this._getVault(vaultName)
      secret = vault.getSecret(secretName)
    } catch(err) {
      throw err
    }
    return secret
  }

  /////////////
  // Vaults //
  /////////////
  async createVault(vaultName: string, key: Buffer | undefined = undefined) {
    const path = Path.join(this._polykeyPath, vaultName)
    let vaultExists: boolean
    try {
      vaultExists = await this._fileExists(path)
    } catch(err) {
      throw err
    }

    // TODO: we're just doubly throwing the error here
    if (vaultExists) {
      throw Error('Vault already exists!')
    }

    try {
      // Directory not present, create one
      this._fs.mkdirSync(path, {recursive:true})
      // Create key if not provided
      let vaultKey: Buffer
      if (key === undefined) {
        // Generate new key
        vaultKey = crypto.randomBytes(vaultKeySize)
      } else {
        // Assign key if it is provided
        vaultKey = key
      }
      this._metadata[vaultName] = { key: vaultKey, tags: []}
      // TODO: this methods seems a bit magical
      await this._writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this._polykeyPath, this._fs)
      this._vaults.set(vaultName, vault)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async vaultExists(vaultName: string): Promise<boolean> {
    const path = Path.join(this._polykeyPath, vaultName)
    const vaultExists = this._fs.existsSync(path)

    return vaultExists
  }

  async destroyVault(vaultName: string) {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

    const path = Path.join(this._polykeyPath, vaultName)
    // Remove directory on file system
    if (this._fs.existsSync(path)) {
      this._fs.rmdirSync(path, {recursive: true})
    }
    // Remaining garbage collection:
    // Remove vault from vaults map
    if (this._vaults.has(vaultName)) {
      this._vaults.delete(vaultName)
    }
    // Remove from metadata
    if (this._metadata.hasOwnProperty(vaultName)) {
      delete this._metadata[vaultName]
      await this._writeMetadata()
    }

    const vaultPathExists = this._fs.existsSync(path)
    if (vaultPathExists) {
      console.log(path)
      
      throw(Error('Vault path could not be destroyed!'))
    }
    const vaultEntryExists = this._vaults.has(vaultName)
    if (vaultEntryExists) {
      throw(Error('Vault could not be removed from PolyKey!'))
    }
    const metaDataHasVault = this._metadata.hasOwnProperty(vaultName)
    if (metaDataHasVault) {
      throw(Error('Vault metadata could not be destroyed!'))
    }
  }


  /* Validates whether all the artefacts needed to operate
  * a Vault are present. Namely this the vault directory
  * and the metadata for the vault containg the key
  */
  async _validateVault (vaultName: string): Promise<void> {
    const existsMeta = _.has(this._metadata, vaultName)
    if (!existsMeta) {
      throw Error('Vault metadata does not exist')
    }
    const vaultPath = Path.join(this._polykeyPath, vaultName)
    const existsFS = await this._fileExists(vaultPath)
    if (!existsFS) {
      throw Error('Vault directory does not exist')
    }
  }

  removeItem () {

  }

  listItems () {

  }

  listVaults(): string[] {
    return Array.from(this._vaults.keys())
  }

  async listSecrets(vaultName: string): Promise<string[]> {
    const vault = await this._getVault(vaultName)
    return vault.listSecrets()
  }

  signFile (path: string) {
    // this._km.sign

  }

  tagVault () {

  }

  untagVault () {

  }

  shareVault () {

  }

  unshareVault () {

  }


  /* ============ HELPERS =============== */
  async _writeMetadata(): Promise<void> {
    try {
      await jsonfile.writeFile(this._metadataPath, this._metadata)
    } catch (err) {
      throw Error("Error writing vault key to config file")
    }
  }

  private async _getVault(vaultName: string): Promise<Vault> {
    if (this._vaults.has(vaultName)) {
      const vault = this._vaults.get(vaultName)
      if (vault) {
        return vault
      }
    }
    // vault not in map, create new instance
    try {
      await this._validateVault(vaultName)
    } catch(err) {
      throw err
    }
    const vaultKey = this._metadata[vaultName].key
    const vault = new Vault(vaultName, vaultKey, this._polykeyPath, this._fs)
    this._vaults.set(vaultName, vault)
    return vault
  }

  _initSync(): void {
    // check if .polykey exists
    //  make folder if doesn't
    if (!this._fs.existsSync(this._polykeyPath)) {
      this._fs.mkdirSync(this._polykeyPath, {recursive: true})
      const metadataTemplate = {}
      jsonfile.writeFileSync(this._metadataPath, metadataTemplate)
      this._metadata = metadataTemplate
    } else if (this._fs.existsSync(this._metadataPath)) {
      this._metadata = jsonfile.readFileSync(this._metadataPath)
    }
    
    // Load all of the vaults into memory
    for (const vaultName in this._metadata) {
      if (this._metadata.hasOwnProperty(vaultName)) {
        const path = Path.join(this._polykeyPath, vaultName)
        if (this._fileExistsSync(path)) {
          const vaultKey = this._metadata[vaultName].key
          const vault = new Vault(vaultName, vaultKey, this._polykeyPath, this._fs)
          this._vaults.set(vaultName, vault)
        }
      }
    }
  }

  // TODO: we don't even open the file here
  _loadKey(path: string | Buffer, keySize: number = this._keySize): Buffer {
    if (path instanceof Buffer) {
      return path
    }
    const keyBuf = Buffer.from(fs.readFileSync(path, undefined))
    return keyBuf
  }
}
