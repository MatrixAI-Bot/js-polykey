import fs from 'fs'
import os from 'os'
import Path from 'path'
import crypto from 'crypto'
import jsonfile from 'jsonfile'
import { promisify } from 'util'
import git from 'isomorphic-git'
import Vault from './VaultStore/Vault'
import { KeyManager } from './KeyManager'
import http from 'isomorphic-git/http/node'
import PolykeyNode from './P2P/PolykeyNode'
import { efsCallbackWrapper } from './util'
import GitServer from './GitServer/GitServer'
import VaultStore from './VaultStore/VaultStore'
import PeerInfo from './P2P/PeerStore/PeerInfo'
import Multiaddr from 'multiaddr'


type Metadata = {
  vaults: {
    [vaultName: string]: {
      key: Buffer, tags: Array<string>
    }
  }
  publicKeyPath: string | null
  privateKeyPath: string | null
}

const vaultKeySize = 128/8 // in bytes
// TODO: key typescript public/private variables

export default class Polykey {
  private publicKey: string
  private privateKey: string
  private polykeyDirName: string
  polykeyPath: string
  private fs: typeof fs
  private vaultStore: VaultStore
  private keySize: number
  private metadata: Metadata
  private metadataPath: string
  keyManager: KeyManager

  polykeyNode: PolykeyNode

  constructor(
    publicKey: Buffer | string,
    privateKey: Buffer | string,
    km: KeyManager | undefined = undefined,
    keyLen: number | undefined = undefined,
    homeDir: string = os.homedir()
  ) {
    homeDir = homeDir || os.homedir()
    this.polykeyDirName = homeDir
    this.polykeyPath = Path.join(homeDir, '.polykey')
    this.metadataPath = Path.join(this.polykeyPath, 'metadata')
    // Load keys
    this.publicKey = this.loadKey(publicKey)
    this.privateKey = this.loadKey(privateKey)
    // Set keymanager if it hasn't been provided yet
    this.keyManager = km || new KeyManager(this.polykeyPath, this.publicKey, this.privateKey)
    // Set file system
    this.fs = fs
    // Initialize reamining members
    this.vaultStore = new VaultStore()

    this.keySize = keyLen ?? 32
    this.metadata = {
      vaults: {},
      publicKeyPath: null,
      privateKeyPath: null
    }

    this.polykeyNode = new PolykeyNode(this.publicKey, this.keyManager)

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
    await this.polykeyNode.start()
    return await this.startPolykeyDaemon()
  }

  ////////////
  // Vaults //
  ////////////
  async createVault(vaultName: string): Promise<Vault> {
    const path = Path.join(this.polykeyDirName, vaultName)
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
      const vault = new Vault(vaultName, vaultKey, this.polykeyDirName)
      this.vaultStore.setVault(vaultName, vault)
      return await this.getVault(vaultName)
    } catch (err) {
      // Delete vault dir and garbage collect
      await this.destroyVault(vaultName)
      throw err
    }
  }

  async findPeer(pubKey: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.polykeyNode.multicastPeerDiscovery.requestPeerContact(pubKey)
      this.polykeyNode.multicastPeerDiscovery.on('found', (peerInfo: PeerInfo) => {
        if (peerInfo.publicKey == pubKey) {
          console.log('hehehe');

          resolve()
        } else {
          reject(Error('Pubkey was not the same'))
        }
      })
    })
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

    const path = Path.join(this.polykeyDirName, vaultName)
    // Remove directory on file system
    if (this.fs.existsSync(path)) {
      this.fs.rmdirSync(path, {recursive: true})
    }
    // Remaining garbage collection:
    // Remove vault from vaults map
    if (this.vaultStore.hasVault(vaultName)) {
      this.vaultStore.deleteVault(vaultName)
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
    const vaultEntryExists = this.vaultStore.hasVault(vaultName)
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

  async verifyFile(filePath: string, signaturePath: string, publicKey: string | Buffer | undefined = undefined, passphrase: string): Promise<string> {
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
        if (publicKeyPath !== null && privateKeyPath !== null) {
          await this.keyManager.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            privateKeyPassphrase
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
  private async startPolykeyDaemon() {
    console.log(Path.resolve(this.polykeyDirName));

    const repos = new GitServer(
      Path.resolve(this.polykeyDirName),
      this.vaultStore
    );

    const addressInfo = repos.listen()

    // Add to peerInfo
    const maString = `/ip4/127.0.0.1/tcp/${addressInfo.port}`
    console.log(maString);

    this.polykeyNode.peerStore.peerInfo.multiaddrs.add(new Multiaddr(maString))

    const addressString = `http://localhost:${addressInfo.port}`

    console.log(`Encrypted Vaults now listening on port: ${addressInfo.port}`);

    return addressString
  }

  tagVault() {

  }

  untagVault() {

  }

  private peerExists(peer: PeerInfo | string): boolean {
    const pubKey = (peer instanceof PeerInfo) ? peer.publicKey : peer
    return this.polykeyNode.peerStore.has(pubKey)
  }

  async shareVault(vaultName: string, pubKey: string) {
    // Confirm peer exists in our store
    if (!this.peerExists(pubKey)) {
      throw(new Error('Peer does not exists in peer store'))
    }
    try {
      this.vaultStore.shareVault(vaultName, pubKey)
    } catch (err) {
      throw(err)
    }
  }

  async unshareVault(vaultName: string, pubKey: string) {
    try {
      this.vaultStore.unshareVault(vaultName, pubKey)
    } catch (err) {
      throw(err)
    }
  }

  async cloneVault(peerPubKey: string, vaultName: string) {
    // Check if peer exists
    const peerInfo = this.polykeyNode.peerStore.get(peerPubKey)
    if (!peerInfo) {
      throw(new Error('Peer does not exist in peer store'))
    }

    // Get peer address from peerinfo in peer store
    const multiaddr: Multiaddr = peerInfo.multiaddrs.values().next().value

    if (!multiaddr) {
      throw(new Error('Peer does not have a connected address'))
    }
    const addr = multiaddr.nodeAddress()

    // Create a new vault
    const vault = await this.createVault(vaultName)

    // Clone from remote peer
    await git.clone({
      fs: efsCallbackWrapper(vault.efs),
      http: http,
      dir: vault.vaultPath,
      url: `http://${addr.address}:${addr.port}/${vault.name}`,
      singleBranch: true
    })

    // Add peerId to shared peers
    this.vaultStore.shareVault(vault.name, peerPubKey)
  }

  async pullVault(peerPubKey: string, vaultName: string) {
    // Check if peer exists
    const peerInfo = this.polykeyNode.peerStore.get(peerPubKey)
    if (!peerInfo) {
      throw(new Error('Peer does not exist in peer store'))
    }

    // Get peer address from peerinfo in peer store
    const multiaddr: Multiaddr = peerInfo.multiaddrs.values().next().value

    if (!multiaddr) {
      throw(new Error('Peer does not have a connected address'))
    }
    const addr = multiaddr.nodeAddress()

    // Get a new vault
    const vault = await this.getVault(vaultName)

    // Clone from remote peer
    await git.pull({
      fs: efsCallbackWrapper(vault.efs),
      http: http,
      dir: vault.vaultPath,
      url: `http://${addr.address}:${addr.port}/${vault.name}`,
      singleBranch: true
    })
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
    if (this.vaultStore.hasVault(vaultName)) {
      const vault = this.vaultStore.getVault(vaultName)
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
    this.vaultStore.setVault(vaultName, vault)
    return vault
  }

  initSync(): void {
    // check if polykey path exists and make it if it doesn't
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
            this.vaultStore.setVault(vaultName, vault)
          } catch (err) {
            throw(err);
            throw(Error(`Failed to initialize vault '${vaultName}: ${err.message}'`));
          }
        }
      }
    }
  }

  // TODO: we don't even open the file here
  private loadKey(path: string | Buffer, keySize: number = this.keySize): string {
    if (path instanceof Buffer) {
      return path.toString()
    }
    const keyBuf = Buffer.from(this.fs.readFileSync(path, undefined))
    return keyBuf.toString()
  }
}
