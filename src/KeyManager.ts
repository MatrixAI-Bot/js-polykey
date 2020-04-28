// @flow
import fs from 'fs-extra'
import crypto from 'crypto'
import process from 'process'
import openpgp from 'openpgp'
import Path from 'path'
import { promisify } from 'util'
import { rejects } from 'assert'

// TODO: flow type annotations
// TODO: funciton docs


// TODO: remember that the symmetric keys will just be stored in vault directories.
// I feel the symmetric key funciton here are not needed.
// This should be dealing with asymm key management
// Should the ciphering happen through cryptor?
  // I think it should

// Make a base class (or interaface) 'Key'. It has most of the methods you see here. The symetric and asymmetric keys
// can both have their implementations of it. For example, they'd both have different generateKeyPj
// Or maybe just return two different objects from within the class, one for symmetric and onle for asymmetric

// We want a consistent and uniform library. So even if we change crypto libraries for symm or asymm, not much
// changes for compositional code. KeyManager, returns a 'Key' instance. There can be difference classes for both
// symm and asymm. Cryptor can then take these Key classes, which expose the crytpo functions. So even if the
// crypto library changes, Cryptor doesn't have to cahnge and neither does polykey.
type KeyPair = {
  private: string,
  public: string
}

export default class KeyManager {
  // TODO: wouldn't keymanager have many sym keys keys to look after?
  _keyPair: KeyPair = {private: '', public: ''}
  _key!: Buffer
  _salt!: Buffer
  _passphrase!: string
  _storePath: string = '~/.polykey/'
  constructor() {
  }

  // return {private: string, public: string}
  async generateKeyPair(name: string, email: string, passphrase: string, numBits: number = 4096): Promise<KeyPair> {
    var options = {
      userIds: [{ name: name, email: email }], // multiple user IDs
      numBits: 4096,                                            // RSA key size
      passphrase: passphrase
    }

    this._passphrase = passphrase

    return new Promise<KeyPair>((resolve, reject) => {
      openpgp.generateKey(options).then((key) => {
        const privkey = key.privateKeyArmored // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
        const pubkey = key.publicKeyArmored   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '

        const keypair = { private: privkey, public: pubkey }

        resolve(keypair)
        // TODO: revocation signature?
        // var revocationSignature = key.revocationSignature // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
      }).catch((err) => {
        reject(err)
      })
    })
  }

  getKeyPair(): KeyPair {
    return this._keyPair
  }

  getPublicKey(): string {
    return this._keyPair.public
  }

  getPrivateKey(): string {
    return this._keyPair.private
  }

  async loadPrivateKey(path: string, passphrase: string = ''): Promise<void> {
    const key = (await fs.readFile(path)).toString()
    this._keyPair.private = key

    if (passphrase) {
      this._passphrase = passphrase
    }
  }

  async loadPublicKey(path: string): Promise<void> {
    const key = (await fs.readFile(path)).toString()
    this._keyPair.public = key
  }

  async loadKeyPair(privPath: string, pubPath: string, passphrase: string = '') {
    await this.loadPrivateKey(privPath)
    await this.loadPublicKey(pubPath)

    if (passphrase) {
      this._passphrase
    }
  }

  async storePrivateKey(path: string): Promise<void> {
    await fs.writeFile(path, this._keyPair.private)
  }

  async storePublicKey(path: string): Promise<void> {
    await fs.writeFile(path, this._keyPair.public)
  }

  // symmetric key generation
  generateKeySync(passphrase: string, salt: Buffer = crypto.randomBytes(32)): Buffer {
    const [algo, keyLen, numIterations] = ['sha256', 256/8, 10000]
    this._key = crypto.pbkdf2Sync(passphrase , salt, numIterations, keyLen, algo)
    this._salt = salt

    return this._key
  }

  async generateKey(passphrase: string, salt: Buffer = crypto.randomBytes(32)): Promise<Buffer> {
    const [algo, keyLen, numIterations] = ['sha256', 256/8, 10000]
    this._key = await promisify(crypto.pbkdf2)(passphrase , salt, numIterations, keyLen, algo)
    this._salt = salt

    return this._key
  }

  loadKeySync(keyPath: string): void {
    this._key = fs.readFileSync(keyPath)
  }

  async loadKey(keyPath: string): Promise<void> {
    try {
      this._key = await fs.readFile(keyPath)
    } catch(err) {
      throw Error('Reading key from disk')
    }
  }

  loadKeyBuffer(key: Buffer): void {
    this._key = key
  }

  async storeKey(path: string, createPath?: boolean): Promise<void> {
    if (!this._key) {
      throw Error('There is no key loaded')
    }
    try {
      if (createPath) {
        await fs.outputFile(path, this._key)
      } else {
        await fs.writeFile(path, this._key)
      }
    } catch(err) {
      throw Error('Writing key to disk')
    }
  }

  storeKeySync(path: string, createPath?: boolean): void {
    if (!this._key) {
      throw Error('There is no key loaded')
    }
    try {
      if (createPath) {
        fs.outputFileSync(path, this._key)
      } else {
        fs.writeFileSync(path, this._key)
      }
    } catch(err) {
      throw Error('Writing key to disk')
    }
  }

  async storeProfile(name: string, storeKey: boolean = false): Promise<void> {
    const profilePath = Path.join(this._storePath, name)
    if (!this._key && !this._salt) {
      throw Error('There is nothing loaded to store')
    }
    try {
      const profileExists = await fs.pathExists(profilePath)
      if (profileExists) {
        console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`)
      } else {
        await fs.mkdirs(profilePath)
      }
      if (storeKey && this._key) {
        await fs.writeFile(Path.join(profilePath, 'key'), this._key)
      }
      if (this._salt) {
        await fs.writeFile(Path.join(profilePath, 'salt'), this._salt)
      }
    } catch (err) {
      throw Error('Writing profile')
    }
  }

  async storeProfileSync(name: string, storeKey: boolean = false): Promise<void> {
    const profilePath = Path.join(this._storePath, name)
    if (!this._key && !this._salt) {
      throw Error('There is nothing loaded to warrant storage')
    }
    try {
      const profileExists = await fs.pathExistsSync(profilePath)
      if (profileExists) {
        console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`)
      } else {
        await fs.mkdirsSync(profilePath)
      }
      if (storeKey && this._key) {
        await fs.writeFileSync(Path.join(profilePath, 'key'), this._key)
      }
      if (this._salt) {
        await fs.writeFileSync(Path.join(profilePath, 'salt'), this._key)
      }
    } catch (err) {
      throw Error('Writing profile')
    }
  }

  async loadProfile(name: string, passphrase?: string): Promise<void> {
    const profilePath = Path.join(this._storePath, name)
    try {
      if (passphrase) {
        this._salt = await fs.readFile(Path.join(profilePath, 'salt'))
        // TODO: use async version
        this.generateKeySync(passphrase, this._salt)
        return
      }
    } catch(err) {
      throw Error('Loading profile salt from disk')
    }
    try {
      this._key = await fs.readFile(Path.join(profilePath, 'key'))
    } catch (err) {
      throw Error('Loading profile key from disk')
    }
  }

  getKey(): Buffer {
    return this._key
  }

  isLoaded(): boolean {
    if (this._key) {
      return true
    }
    return false
  }
  // TODO: when storing and loading profiles you should be able to specify a location not just '~/.efs'
}