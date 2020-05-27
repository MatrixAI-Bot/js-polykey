import fs from 'fs-extra'
import Path from 'path'
import os from 'os'
import Vault from './Vault'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import { KeyManager } from './KeyManager'
import GitBackend from './version-control/git-backend/GitBackend'
// import PolykeyNode from './p2p/PolykeyNode'
import { promisify } from 'util'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import EncryptedFS from 'encryptedfs'
import VaultStore from './VaultStore/VaultStore'
import { Git } from './version-control/git-server/git'

type Metadata = {
  vaults: {
    [vaultName: string]: {
      key: Buffer, tags: Array<string>
    }
  }
  publicKeyPath: string | null
  privateKeyPath: string | null
  passphrase: string | null
}

// TODO: convert sync to promises

/* const prom = {
  access: util.promisify(fs.access),
  mkdir: util.promisify(fs.mkdir)
} */
const vaultKeySize = 128/8 // in bytes
// TODO: key typescript public/private variables

export default class Polykey {
  private polykeyDirName: string
  polykeyPath: string
  private fs: typeof fs
  private vaultStore: VaultStore
  private key: Buffer
  private keySize: number
  private metadata: Metadata
  private metadataPath: string
  keyManager: KeyManager

  // private polykeyNode: PolykeyNode

  constructor(
    key: Buffer | string,
    km: KeyManager | undefined = undefined,
    keyLen: number | undefined = undefined,
    homeDir: string = os.homedir(),
    peerId: PeerId
  ) {
    this.keyManager = km || new KeyManager(this.polykeyPath)
    homeDir = homeDir || os.homedir()
    this.polykeyDirName = '.polykey'
    this.polykeyPath = Path.join(homeDir, this.polykeyDirName)
    this.metadataPath = Path.join(this.polykeyPath, 'metadata')
    // Load keys
    if (typeof key === 'string') {
      this.key = this.loadKey(key!)
    } else {
      this.key = key
    }
    // Set file system
    this.fs = fs
    // Initialize reamining members
    // this.vaults = new Map()
    this.vaultStore = new VaultStore()


    this.keySize = keyLen ?? 32
    this.metadata = {
      vaults: {},
      publicKeyPath: null,
      privateKeyPath: null,
      passphrase: null
    }

    // this.polykeyNode = new PolykeyNode(peerId)

    // sync with polykey directory
    this.initSync()
  }

  static get KeyManager() {
    return KeyManager
  }

  /////////////
  // Secrets //
  /////////////
  async secretExists(vaultName: string, secretName: string): Promise<boolean> {
    const vault = await this.getVault(vaultName)
    const secretExists = vault._secretExists(secretName)

    return secretExists
  }

  async addSecret(vaultName: string, secretName: string, secret: Buffer): Promise<void> {
    let vault: Vault
    try {
      vault = await this.getVault(vaultName)
    } catch(err) {
      throw err
    }

    vault.addSecret(secretName, secret)
  }

  async getSecret(vaultName: string, secretName: string): Promise<Buffer | string> {
    let vault: Vault
    let secret: string | Buffer
    try {
      vault = await this.getVault(vaultName)
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
      vault = await this.getVault(vaultName)
      secret = vault.getSecret(secretName)
    } catch(err) {
      throw err
    }
    return secret
  }


  ////////////////
  // Networking //
  ////////////////
  async start(): Promise<string> {
    // await this.polykeyNode.start()
    return await this.beginPolyKeyDaemon()
  }

  // addMultiaddr(addrs: Multiaddr[]) {
  //   for (const addr of addrs) {
  //     this.polykeyNode.peerStore.peerInfo.multiaddrs.add(addr)
  //   }
  // }

  ////////////
  // Vaults //
  ////////////
  async createVault(vaultName: string): Promise<Vault> {
    const path = Path.join(this.polykeyPath, vaultName)
    let vaultExists: boolean
    try {
      vaultExists = (await promisify(this.fs.exists)(path))
    } catch(err) {
      throw err
    }

    // TODO: we're just doubly throwing the error here
    if (vaultExists) {
      throw Error('Vault already exists!')
    }

    try {
      // Directory not present, create one
      this.fs.mkdirSync(path, {recursive:true})
      // Create vault key
      let vaultKey = crypto.randomBytes(vaultKeySize)

      this.metadata.vaults[vaultName] = { key: vaultKey, tags: []}
      // TODO: this methods seems a bit magical
      await this.writeMetadata()
      const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
      this.vaultStore.set(vaultName, vault)
      return await this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async vaultExists(vaultName: string): Promise<boolean> {
    const path = Path.join(this.polykeyPath, vaultName)
    const vaultExists = this.fs.existsSync(path)

    return vaultExists
  }

  async destroyVault(vaultName: string) {

    // this is convenience function for removing all tags
    // and triggering garbage collection
    // destruction is a better word as we should ensure all traces is removed

    const path = Path.join(this.polykeyPath, vaultName)
    // Remove directory on file system
    if (this.fs.existsSync(path)) {
      this.fs.rmdirSync(path, {recursive: true})
    }
    // Remaining garbage collection:
    // Remove vault from vaults map
    if (this.vaultStore.has(vaultName)) {
      this.vaultStore.delete(vaultName)
    }
    // Remove from metadata
    if (this.metadata.vaults.hasOwnProperty(vaultName)) {
      delete this.metadata.vaults[vaultName]
      await this.writeMetadata()
    }

    const vaultPathExists = this.fs.existsSync(path)
    if (vaultPathExists) {
      throw(Error('Vault path could not be destroyed!'))
    }
    const vaultEntryExists = this.vaultStore.has(vaultName)
    if (vaultEntryExists) {
      throw(Error('Vault could not be removed from PolyKey!'))
    }
    const metaDataHasVault = this.metadata.vaults.hasOwnProperty(vaultName)
    if (metaDataHasVault) {
      throw(Error('Vault metadata could not be destroyed!'))
    }
  }

  async importKeyPair(privateKeyPath: string, publicKeyPath: string, passphrase: string = '') {
    await this.keyManager.loadKeyPair(privateKeyPath, publicKeyPath, passphrase)
    this.metadata.publicKeyPath = publicKeyPath
    this.metadata.privateKeyPath = privateKeyPath
    this.metadata.passphrase = passphrase
    this.writeMetadata()
  }

  /* Validates whether all the artefacts needed to operate
  * a Vault are present. Namely this the vault directory
  * and the metadata for the vault containg the key
  */
  async validateVault(vaultName: string): Promise<void> {
    const existsMeta = this.metadata.vaults.hasOwnProperty(vaultName)
    if (!existsMeta) {
      throw Error('Vault metadata does not exist')
    }
    const vaultPath = Path.join(this.polykeyPath, vaultName)
    const existsFS = (await promisify(this.fs.exists)(vaultPath))
    if (!existsFS) {
      throw Error('Vault directory does not exist')
    }
  }

  removeItem () {

  }

  listItems () {

  }

  listVaults(): string[] {
    return this.vaultStore.getVaultNames()
  }

  async listSecrets(vaultName: string): Promise<string[]> {
    const vault = await this.getVault(vaultName)
    return vault.listSecrets()
  }

  async verifyFile(filePath: string, signaturePath: string, publicKey: string | Buffer | undefined = undefined): Promise<string> {
    try {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (publicKey !== undefined) {
        if (typeof publicKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = Buffer.from(this.fs.readFileSync(publicKey))
        } else {  // Buffer
          keyBuffer = publicKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this.metadata.publicKeyPath
        const privateKeyPath = this.metadata.privateKeyPath
        const passphrase = this.metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this.keyManager.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
      // Read in file buffer and signature
      const fileBuffer = Buffer.from(this.fs.readFileSync(filePath, undefined))
      const signatureBuffer = Buffer.from(this.fs.readFileSync(signaturePath, undefined))
      const verified = await this.keyManager.verifyData(fileBuffer, signatureBuffer, keyBuffer)
      return verified
    } catch (err) {
      throw(err)
    }
  }

  async signFile(path: string, privateKey: string | Buffer | undefined = undefined, privateKeyPassphrase: string | undefined = undefined): Promise<string> {
    try {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (privateKey !== undefined) {
        if (typeof privateKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = Buffer.from(this.fs.readFileSync(privateKey))
        } else {  // Buffer
          keyBuffer = privateKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this.metadata.publicKeyPath
        const privateKeyPath = this.metadata.privateKeyPath
        const passphrase = this.metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this.keyManager.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
      // Read file into buffer
      const buffer = Buffer.from(this.fs.readFileSync(path, undefined))
      // Sign the buffer
      const signedBuffer = await this.keyManager.signData(buffer, keyBuffer, privateKeyPassphrase)
      // Write buffer to signed file
      const signedPath = `${path}.sig`
      this.fs.writeFileSync(signedPath, signedBuffer)
      return signedPath
    } catch (err) {
      throw(Error(`failed to sign file: ${err}`))
    }
  }

  // P2P operations
  private async beginPolyKeyDaemon() {
    // const repos = new GitBackend(
    //   this.polykeyPath,
    //   this.vaultStore
    // );
    const repos = new Git(
      this.polykeyPath,
      {
        autoCreate: true
      }
    );
    const port = 7004;

    repos.on('push', (push) => {
        console.log(`push ${push.repo}/${push.commit} (${push.branch})`);
        push.accept();
    });

    repos.on('fetch', (fetch) => {
      console.log(`fetch ${fetch.commit}`);
      fetch.accept();
    });

    // repos.listen(port)
    repos.listen(port, {}, () => {
      console.log('listening on port 7004');

    })

    return `ip4/127.0.0.1/tcp/${port}`
  }

  tagVault() {

  }

  untagVault() {

  }

  shareVault(vaultName: string): string {
    // Get vault
    const vault = this.vaultStore.get(vaultName)
    if (vault) {
      return vault.shareVault()
    } else {
      throw(Error('Vault does not exist'))
    }
  }

  unshareVault() {

  }

  async pullVault(addr: string, vaultName: string) {
    // Create vault first if it doesn't exist
    let vault: Vault
    if (!(await this.vaultExists(vaultName))) {
      vault = await this.createVault(vaultName)
    } else {
      vault = await this.getVault(vaultName)
    }

    // Add new peer
    vault.addPeer(addr)

    // Make vault pull from peer vault
    await vault.pullVault()
  }


  /* ============ HELPERS =============== */
  async writeMetadata(): Promise<void> {
    try {
      await jsonfile.writeFile(this.metadataPath, this.metadata)
    } catch (err) {
      throw Error("Error writing vault key to config file")
    }
  }

  private async getVault(vaultName: string): Promise<Vault> {
    if (this.vaultStore.has(vaultName)) {
      const vault = this.vaultStore.get(vaultName)
      if (vault) {
        return vault
      }
    }
    // vault not in map, create new instance
    try {
      await this.validateVault(vaultName)
    } catch(err) {
      throw err
    }
    const vaultKey = this.metadata.vaults[vaultName].key
    const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
    this.vaultStore.set(vaultName, vault)
    return vault
  }

  initSync(): void {
    // check if .polykey exists
    //  make folder if doesn't
      console.log(this.polykeyPath);
    if (!this.fs.existsSync(this.polykeyPath)) {
      this.fs.mkdirSync(this.polykeyPath, {recursive: true})
      const metadataTemplate = {
        vaults: {},
        publicKeyPath: null,
        privateKeyPath: null,
        passphrase: null
      }
      jsonfile.writeFileSync(this.metadataPath, metadataTemplate)
      this.metadata = metadataTemplate
    } else if (this.fs.existsSync(this.metadataPath)) {
      this.metadata = jsonfile.readFileSync(this.metadataPath)
    }

    // Load all of the vaults into memory
    for (const vaultName in this.metadata.vaults) {
      if (this.metadata.vaults.hasOwnProperty(vaultName)) {
        const path = Path.join(this.polykeyPath, vaultName)
        if (this.fs.existsSync(path)) {
          try {
            const vaultKey = Buffer.from(this.metadata.vaults[vaultName].key)
            const vault = new Vault(vaultName, vaultKey, this.polykeyPath)
            this.vaultStore.set(vaultName, vault)
          } catch (err) {
            throw(err);
            throw(Error(`Failed to initialize vault '${vaultName}: ${err.message}'`));
          }
        }
      }
    }
  }

  // TODO: we don't even open the file here
  private loadKey(path: string | Buffer, keySize: number = this.keySize): Buffer {
    if (path instanceof Buffer) {
      return path
    }
    const keyBuf = Buffer.from(this.fs.readFileSync(path, undefined))
    return keyBuf
  }
}
