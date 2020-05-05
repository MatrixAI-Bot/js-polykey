import fs from 'fs-extra'
import Path from 'path'
import os from 'os'
import Vault from './Vault'
import crypto, { sign } from 'crypto'
import jsonfile from 'jsonfile'
import _ from 'lodash'
import KeyManager from './KeyManager'
import EncryptedFS from '../encryptedfs-tmp/EncryptedFS'
import { KeyPair } from './util'

// js imports
const Libp2p = require('libp2p')
const Bootstrap = require('libp2p-bootstrap')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')
const SECIO = require('libp2p-secio')
const PeerInfo = require('peer-info')
const KadDHT = require('libp2p-kad-dht')
const delay = require('delay')
const multiaddr = require('multiaddr')
const pipe = require('it-pipe')
const { toBuffer } = require('it-buffer')
const { collect } = require('streaming-iterables')


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
  private _polykeyDirName: string
  private _polykeyPath: string
  // private _fs: typeof fs
  _fs: typeof fs
  private _vaults:Map<string, Vault>
  private _key: Buffer
  private _keySize: number
  private _metadata: Metadata
  private _metadataPath: string
  _km: KeyManager

  _node: any

  constructor(
    key: Buffer | string,
    km: KeyManager | undefined = undefined,
    keyLen: number | undefined = undefined,
    homeDir: string = os.homedir()
  ) {
    this._km = km || new KeyManager(this._polykeyPath)
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
    this._fs = fs
    // Initialize reamining members
    this._vaults = new Map()
    this._keySize = keyLen ?? 32
    this._metadata = {
      vaults: {},
      publicKeyPath: null,
      privateKeyPath: null,
      passphrase: null
    }
    // sync with polykey directory
    this._initSync()
    
  }

  static get KeyManager() {
    return KeyManager
  }
  get polykeyPath() {
    return this._polykeyPath
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
      this._metadata.vaults[vaultName] = { key: vaultKey, tags: []}
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
    if (this._metadata.vaults.hasOwnProperty(vaultName)) {
      delete this._metadata.vaults[vaultName]
      await this._writeMetadata()
    }

    const vaultPathExists = this._fs.existsSync(path)
    if (vaultPathExists) {
      throw(Error('Vault path could not be destroyed!'))
    }
    const vaultEntryExists = this._vaults.has(vaultName)
    if (vaultEntryExists) {
      throw(Error('Vault could not be removed from PolyKey!'))
    }
    const metaDataHasVault = this._metadata.vaults.hasOwnProperty(vaultName)
    if (metaDataHasVault) {
      throw(Error('Vault metadata could not be destroyed!'))
    }
  }


  /* Validates whether all the artefacts needed to operate
  * a Vault are present. Namely this the vault directory
  * and the metadata for the vault containg the key
  */
  async _validateVault (vaultName: string): Promise<void> {
    const existsMeta = _.has(this._metadata.vaults, vaultName)
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

  async verifyFile(signedPath: string, outputPath: string, publicKey: string | Buffer | undefined = undefined): Promise<void> {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (publicKey !== undefined) {
        if (typeof publicKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = this._fs.readFileSync(publicKey)
        } else {  // Buffer
          keyBuffer = publicKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this._metadata.publicKeyPath
        const privateKeyPath = this._metadata.privateKeyPath
        const passphrase = this._metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this._km.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
    const signedBuffer = this._fs.readFileSync(signedPath, undefined)
    const verifiedBuffer = await this._km.verifyData(signedBuffer, keyBuffer)
    this._fs.writeFileSync(outputPath, verifiedBuffer)
    }

  async signFile(path: string, privateKey: string | Buffer | undefined = undefined, privateKeyPassphrase: string | undefined = undefined): Promise<string> {
    try {
      // Get key if provided
      let keyBuffer: Buffer | undefined
      if (privateKey !== undefined) {
        if (typeof privateKey === 'string') {  // Path
          // Read in from fs
          keyBuffer = this._fs.readFileSync(privateKey)
        } else {  // Buffer
          keyBuffer = privateKey
        }
      } else {
        // Load keypair into KeyManager from metadata
        const publicKeyPath = this._metadata.publicKeyPath
        const privateKeyPath = this._metadata.privateKeyPath
        const passphrase = this._metadata.passphrase
        if (publicKeyPath !== null && privateKeyPath !== null && passphrase !== null) {
          await this._km.loadKeyPair(
            privateKeyPath,
            publicKeyPath,
            passphrase
          )
        }
      }
      // Read file into buffer
      const buffer = this._fs.readFileSync(path, undefined)
      // Sign the buffer
      const signedBuffer = await this._km.signData(buffer, keyBuffer, privateKeyPassphrase)
      // Write buffer to signed file
      const signedPath = `${path}.sig`
      this._fs.writeFileSync(signedPath, signedBuffer)
      return signedPath
    } catch (err) {
      throw(Error(`failed to sign file: ${err}`))
    }
  }

  tagVault() {

  }

  untagVault() {

  }

  shareVault() {

  }

  unshareVault() {

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
    const vaultKey = this._metadata.vaults[vaultName].key
    const vault = new Vault(vaultName, vaultKey, this._polykeyPath)
    this._vaults.set(vaultName, vault)
    return vault
  }

  async tcpNode() {
    // A simple upgrader that just returns the MultiaddrConnection
    const upgrader = {
      upgradeInbound: maConn => maConn,
      upgradeOutbound: maConn => maConn
    }

    const tcp = new TCP({ upgrader })

    const listener = tcp.createListener((socket) => {
      console.log('new connection opened')

      pipe(
        ['hello'],
        socket
      )
    })

    // const addr = (await this.getNodeAddrs())[0]
    const addr = '/ip4/127.0.0.1/tcp/9090'
    
    const ma = multiaddr(addr)
    await listener.listen(ma)
    console.log('listening')

    const socket = await tcp.dial(ma)
    
    const values = pipe(
      socket,
      collect
    )
    console.log(`Value: ${await values}`)

    // Close connection after reading
    await listener.close()
  }

  async startNode(bootstrapMultiaddrs: string[] = []) {
    // Create libp2p node
    const node = await Libp2p.create({
      modules: {
        transport: [TCP],
        connEncryption: [SECIO],
        streamMuxer: [Mplex],
        dht: KadDHT
      },
      config: {
        dht: {
          enabled: true
        },
        peerDiscovery: {
          autoDial: true, // Auto connect to discovered peers (limited by ConnectionManager minPeers)
          // The `tag` property will be searched when creating the instance of your Peer Discovery service.
          // The associated object, will be passed to the service when it is instantiated.
          [Bootstrap.tag]: {
            enabled: true,
            list: bootstrapMultiaddrs // provide array of multiaddrs
          }
        }
      }
    })
    const listenAddress = multiaddr(`/ip4/127.0.0.1/tcp/0`)
    node.peerInfo.multiaddrs.add(listenAddress)

    // 
    node.on('peer:discovery', (peer) => {
      console.log('Discovered %s', peer.id.toB58String()) // Log discovered peer
    })

    node.on('peer:connect', (peer) => {
        console.log('Connected to %s', peer.id.toB58String()) // Log connected peer
    })

    node.on('peer:disconnect', (peer) => {
        console.log('Disconnected to %s', peer.id.toB58String()) // Log connected peer
    })

    // Start node
    await node.start()
    console.log('libp2p has started')

    this._node = node

    const stop = async () => {
      // stop libp2p
      await this._node.stop()
      console.log('libp2p has stopped')
      process.exit(0)
    }
    
    process.on('SIGTERM', stop)
    process.on('SIGINT', stop)
  }

  async stopNode() {
    await this._node.stop()
  }

  async pingNode(addr: string) {
    try {
      await this._waitForNodeInit(5)
      const ma = multiaddr(addr)
      const latency = await this._node.ping(ma)
      console.log(`pinged ${addr} in ${latency}ms`)
    } catch (err) {
      console.log('there was an error!');
      throw(err)
    }
  }

  private async _waitForNodeInit(seconds: number) {
    if (this._node === undefined) { // Give the node some time to be initialized
      const attempts = (seconds * 1000) / 100
      for (let i=0; i<attempts; i++) {
        if (this._node === undefined) {
          await delay(100)
        }
      }
      if (this._node === undefined) {
        throw(Error('node was not initialized within 10s'))
      }
    }
  }

  async getNodeAddrs(): Promise<string[]> {
    await this._waitForNodeInit(5)
    
    let nodeAddr: string[] = []

    this._node.peerInfo.multiaddrs.forEach((ma) => {
      nodeAddr.push(`${ma.toString()}/p2p/${this._node.peerInfo.id.toB58String()}`)
    })
    return nodeAddr
  }

  _initSync(): void {
    // check if .polykey exists
    //  make folder if doesn't
    if (!this._fs.existsSync(this._polykeyPath)) {
      this._fs.mkdirSync(this._polykeyPath, {recursive: true})
      const metadataTemplate = {
        vaults: {},
        publicKeyPath: null,
        privateKeyPath: null,
        passphrase: null
      }
      jsonfile.writeFileSync(this._metadataPath, metadataTemplate)
      this._metadata = metadataTemplate
    } else if (this._fs.existsSync(this._metadataPath)) {
      this._metadata = jsonfile.readFileSync(this._metadataPath)
    }
    
    // Load all of the vaults into memory
    for (const vaultName in this._metadata.vaults) {
      if (this._metadata.vaults.hasOwnProperty(vaultName)) {
        const path = Path.join(this._polykeyPath, vaultName)
        if (this._fileExistsSync(path)) {
          try {
            const vaultKey = Buffer.from(this._metadata.vaults[vaultName].key)
            const vault = new Vault(vaultName, vaultKey, this._polykeyPath)
            this._vaults.set(vaultName, vault)
          } catch (err) {
            console.log(`Failed to initialize vault '${vaultName}: ${err.message}'`);
          }
        }
      }
    }
  }

  // TODO: we don't even open the file here
  _loadKey(path: string | Buffer, keySize: number = this._keySize): Buffer {
    if (path instanceof Buffer) {
      return path
    }
    const keyBuf = Buffer.from(this._fs.readFileSync(path, undefined))
    return keyBuf
  }
}
