// import vfs from 'virtualfs'
import fs from 'fs-extra'
import Path from 'path'
import os from 'os'
import Vault from './Vault'
import util from 'util'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import _ from 'lodash'
import nodeFS from 'fs'
import KeyManager from './KeyManager'

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
  _fs: typeof fs
  _vaults:Map<string, Vault>
  // _key: Buffer
  // _pubKey: Buffer
  // _privKey: Buffer
  _keySize: number
  _metadata: Metadata
  _metadataPath: string
  _km: KeyManager
  // KeyManager = KeyManager

  constructor(
    km: KeyManager, 
    keyLen: number = 32, 
    homeDir: string = os.homedir(), 
    altFS: any = fs
  ) {
    this._km = km
    homeDir = homeDir || os.homedir()
/*     this._pubKey = pubKey
    this._privKey = privKey */
    this._polykeyDirName = '.polykey'
    this._polykeyPath = Path.join(homeDir, this._polykeyDirName)
    this._metadataPath = Path.join(this._polykeyPath, 'metadata')
    this._fs = altFS
    this._vaults = new Map()
    // this._key = this._loadKey(key)
    this._keySize = keyLen
    this._metadata = {}
    this._initSync()
  }

  static get KeyManager() {
    return KeyManager
  }
  async _fileExists(path: string): Promise<boolean> {
    return this._fs.pathExists(path)
/*     try {
      await this._fs.access(path)
    } catch(e) {
      // access errors if file doesn't exist
      return false
    }
    return true */
  }
  _fileExistsSync(path: string): boolean {
    return this._fs.pathExistsSync(path)
  }
  
  async createVault(vaultName: string) {
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

    // Directory not present, create one
    try {
      await this._fs.mkdir(path)
      const vaultKey = crypto.randomBytes(vaultKeySize)
      this._metadata[vaultName] = { key : vaultKey, tags: []}
      // TODO: this methods seems a bit magical
      await this._writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this._polykeyPath)
      this._vaults.set(vaultName, vault)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async vaultExists(vaultName: string): Promise<boolean> {
    const path = Path.join(this._polykeyPath, vaultName)
    const vaultExists = await fs.pathExists(path)

    return vaultExists
  }

  async destroyVault(vaultName: string): Promise<boolean> {

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

    const successful: boolean = !this._fs.existsSync(path) && !this._vaults.has(vaultName) && !this._metadata.hasOwnProperty(vaultName)

    return successful
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


  async addSecret (vaultName: string, secretName: string, secret: Buffer): Promise<void> {
    let vault: Vault
    try {
      vault = await this._getVault(vaultName)
    } catch(err) {
      throw err
    }

    vault.addSecret(secretName, secret)
  }

  async getSecret (vaultName: string, secretName: string): Promise<Buffer | string> {
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


  removeItem () {

  }

  listItems () {

  }

  listVaults(): string[] {
    return Array.from(this._vaults.keys())
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

  async _getVault(vaultName: string): Promise<Vault> {
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
    const vault = new Vault(vaultName, vaultKey, this._polykeyPath)
    this._vaults.set(vaultName, vault)
    return vault
  }

  _initSync(): void {
    // check if .polykey exists
    //  make folder if doesn't
    if (!fs.existsSync(this._polykeyPath)) {
      fs.mkdirSync(this._polykeyPath)
      const metadataTemplate = {}
      jsonfile.writeFileSync(this._metadataPath, metadataTemplate)
      this._metadata = metadataTemplate
    } else if (fs.existsSync(this._metadataPath)) {
      this._metadata = jsonfile.readFileSync(this._metadataPath)
    }
    
    // Load all of the vaults into memory
    for (const vaultName in this._metadata) {
      if (this._metadata.hasOwnProperty(vaultName)) {
        const path = Path.join(this._polykeyPath, vaultName)
        if (this._fileExistsSync(path)) {
          const vaultKey = this._metadata[vaultName].key
          const vault = new Vault(vaultName, vaultKey, this._polykeyPath)
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
    const keyBuf = this._fs.readFileSync(path)
    return keyBuf
  }
}
