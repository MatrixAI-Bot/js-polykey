// @flow
import fs from 'fs-extra'
import crypto from 'crypto'
import chalk from 'chalk'
import Path from 'path'
import { promisify } from 'util'
import { KeyPair } from './util'

// js imports
const kbpgp = require('kbpgp')

const F = kbpgp["const"].openpgp;
import zxcvbn from 'zxcvbn'
// TODO: remember that the symmetric keys will just be stored in vault directories.
// I feel the symmetric key funciton here are not needed.
// This should be dealing with asymm key management
// Should the ciphering happen through cryptor?
  // I think it should

// Make a base class (or interaface) 'Key'. It has most of the methods you see here. The symetric and asymmetric keys
// can both have their implementations of it. For example, they'd both have different generateKeyPair
// Or maybe just return two different objects from within the class, one for symmetric and one for asymmetric

// We want a consistent and uniform library. So even if we change crypto libraries for symm or asymm, not much
// changes for compositional code. KeyManager, returns a 'Key' instance. There can be difference classes for both
// symm and asymm. Cryptor can then take these Key classes, which expose the crytpo functions. So even if the
// crypto library changes, Cryptor doesn't have to cahnge and neither does polykey.


export default class KeyManager {
  // TODO: wouldn't keymanager have many sym keys keys to look after?
  private _keyPair: KeyPair = {private: '', public: '', passphrase: ''}
  private _identity: Object | undefined = undefined
  _key!: Buffer
  _salt!: Buffer
  private _passphrase!: string
  private _storePath: string
  private _fs: typeof fs
  constructor(
    polyKeyPath: string = '~/.polykey/'
  ) {
    this._storePath = polyKeyPath
    // Import keypair if it exists
    // Create a vault for key storage
  }

  // return {private: string, public: string}
  async generateKeyPair(name: string, email: string, passphrase: string, numBits: number = 4096): Promise<KeyPair> {
    // Validate passphrase
    const passValidation = zxcvbn(passphrase)
    // The following is an arbitrary delineation of desirable scores
    if (passValidation.score < 2) {
      console.log(chalk.red(`passphrase score for new keypair is below 2!`))
    } else if (passValidation.score <4) {
      console.log(chalk.yellow(`passphrase score for new keypair is below 4!`))
    } else {
      console.log(chalk.green(`passphrase score for new keypair is 4 or above.`))
    }


    // Define options
    var options = {
      userid: `${name} <${email}>`,
      primary: {
        // nbits: 4096,
        nbits: 1024,
        flags: F.certify_keys | F.sign_data | F.auth | F.encrypt_comm | F.encrypt_storage,
        expire_in: 0  // never expire
      },
      subkeys: [
        // {
        //   nbits: 2048,
        //   flags: F.sign_data,
        //   expire_in: 86400 * 365 * 8 // 8 years
        // }
      ]
    }

    this._passphrase = passphrase

    return new Promise<KeyPair>((resolve, reject) => {
      kbpgp.KeyManager.generate(options, (err, identity) => {
        identity.sign({}, (err) => {
          if (err) {
            reject(err)
          }
          // Export pub key first
          identity.export_pgp_public({}, (err, pubKey) => {
            if (err) {
              reject(err)
            }
            // Finally export priv key
            identity.export_pgp_private({passphrase: passphrase}, (err, privKey) => {
              if (err) {
                reject(err)
              }
              // Resolve to parent promise
              const keypair = { private: privKey, public: pubKey, passphrase: passphrase }
              this._keyPair = keypair
              // Set the new identity
              this._identity = identity

              resolve(keypair)
              // TODO: revocation signature?
              // var revocationSignature = key.revocationSignature // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
            })
          })
        })
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

  async loadPrivateKey(privateKey: string | Buffer, passphrase: string = ''): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof privateKey === 'string') {
        keyBuffer = Buffer.from(await fs.readFile(privateKey))
      } else {
        keyBuffer = privateKey
      }
      this._keyPair.private = keyBuffer.toString()

      if (passphrase) {
        this._passphrase = passphrase
      }
    } catch (err) {
      throw(err)
    }
  }

  async loadPublicKey(publicKey: string | Buffer): Promise<void> {
    try {
      let keyBuffer: Buffer
      if (typeof publicKey === 'string') {
        keyBuffer = Buffer.from(await fs.readFile(publicKey))
      } else {
        keyBuffer = publicKey
      }
      this._keyPair.public = keyBuffer.toString()
    } catch (err) {
      throw(err)
    }
  }

  async loadIdentity(passphrase: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const pubKey: string = this.getPublicKey()
      const privKey: string = this.getPrivateKey()

      kbpgp.KeyManager.import_from_armored_pgp({armored: pubKey}, (err, identity) => {
        if (err) {
          reject(err)
        }

        identity.merge_pgp_private({
          armored: privKey
        }, (err) => {
          if (err) {
            reject(err)
          }

          if (identity.is_pgp_locked()) {
            identity.unlock_pgp({
              passphrase: passphrase
            }, (err) => {
              if (err) {
                reject(err)
              }

              this._identity = identity
              resolve()
            })
          } else {
            this._identity = identity
            resolve()
          }
        })
      })
    })
  }

  async loadKeyPair(privateKey: string | Buffer, publicKey: string | Buffer, passphrase: string = '') {
    await this.loadPrivateKey(privateKey)
    await this.loadPublicKey(publicKey)
    await this.loadIdentity(passphrase)

    if (passphrase) {
      this._passphrase
    }
  }

  // async exportPrivateKey(path: string): Promise<void> {
  //   await fs.writeFile(path, this._keyPair.private)
  // }

  // async exportPublicKey(path: string): Promise<void> {
  //   await fs.writeFile(path, this._keyPair.public)
  // }

  // symmetric key generation
  generateKeySync(passphrase: string, salt: Buffer = Buffer.from(crypto.randomBytes(32))): Buffer {
    const [algo, keyLen, numIterations] = ['sha256', 256/8, 10000]
    this._key = Buffer.from(crypto.pbkdf2Sync(passphrase , salt, numIterations, keyLen, algo))
    this._salt = salt

    return this._key
  }

  async generateKey(passphrase: string, salt: Buffer = Buffer.from(crypto.randomBytes(32))): Promise<Buffer> {
    const [algo, keyLen, numIterations] = ['sha256', 256/8, 10000]
    this._key = Buffer.from(await promisify(crypto.pbkdf2)(passphrase , salt, numIterations, keyLen, algo))
    this._salt = salt

    return this._key
  }

  importKeySync(keyPath: string): void {
    this._key = Buffer.from(fs.readFileSync(keyPath))
  }

  async importKey(keyPath: string): Promise<void> {
    try {
      this._key = Buffer.from(await fs.readFile(keyPath))
    } catch(err) {
      throw Error('Reading key from disk')
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

  storeProfileSync(name: string, storeKey: boolean = false): void {
    const profilePath = Path.join(this._storePath, name)
    if (!this._key && !this._salt) {
      throw Error('There is nothing loaded to warrant storage')
    }
    try {
      const profileExists = fs.pathExistsSync(profilePath)
      if (profileExists) {
        console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`)
      } else {
        fs.mkdirsSync(profilePath)
      }
      if (storeKey && this._key) {
        fs.writeFileSync(Path.join(profilePath, 'key'), this._key)
      }
      if (this._salt) {
        fs.writeFileSync(Path.join(profilePath, 'salt'), this._key)
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

  importKeyBuffer(key: Buffer): void {
    this._key = key
  }

  async exportKey(path: string, createPath?: boolean): Promise<void> {
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

  exportKeySync(path: string, createPath?: boolean): void {
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

  async exportProfile(name: string, exportKey: boolean = false): Promise<void> {
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
      if (exportKey && this._key) {
        await fs.writeFile(Path.join(profilePath, 'key'), this._key)
      }
      if (this._salt) {
        await fs.writeFile(Path.join(profilePath, 'salt'), this._salt)
      }
    } catch (err) {
      throw Error('Writing profile')
    }
  }

  exportProfileSync(name: string, storeKey: boolean = false): void {
    const profilePath = Path.join(this._storePath, name)
    if (!this._key && !this._salt) {
      throw Error('There is nothing loaded to warrant storage')
    }
    try {
      const profileExists = fs.pathExistsSync(profilePath)
      if (profileExists) {
        console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`)
      } else {
        fs.mkdirsSync(profilePath)
      }
      if (storeKey && this._key) {
        fs.writeFileSync(Path.join(profilePath, 'key'), this._key)
      }
      if (this._salt) {
        fs.writeFileSync(Path.join(profilePath, 'salt'), this._key)
      }
    } catch (err) {
      throw Error('Writing profile')
    }
  }

  async importProfile(name: string, passphrase?: string): Promise<void> {
    const profilePath = Path.join(this._storePath, name)
    try {
      if (passphrase) {
        this._salt = Buffer.from(await fs.readFile(Path.join(profilePath, 'salt')))
        // TODO: use async version
        this.generateKeySync(passphrase, this._salt)
        return
      }
    } catch(err) {
      throw Error('Loading profile salt from disk')
    }
    try {
      this._key = Buffer.from(await fs.readFile(Path.join(profilePath, 'key')))
    } catch (err) {
      throw Error('Loading profile key from disk')
    }
  }

  async getIdentityFromPublicKey(pubKey: Buffer): Promise<Object> {
    return new Promise<Object>((resolve, reject) => {
      kbpgp.KeyManager.import_from_armored_pgp({armored: pubKey}, (err, identity) => {
        if (err) {
          reject(err)
        }
        resolve(identity)
      })
    })
  }

  async getIdentityFromPrivateKey(privKey: Buffer, passphrase: string): Promise<Object> {
    return new Promise<Object>((resolve, reject) => {
      kbpgp.KeyManager.import_from_armored_pgp({armored: privKey}, (err, identity) => {
        if (err) {
          reject(err)
        }
        if (identity.is_pgp_locked()) {
          identity.unlock_pgp({
            passphrase: passphrase
          }, (err) => {
            if (err) {
              reject(err)
            }
            resolve(identity)
          });
        } else {
          resolve(identity)
        }
      })
    })
  }

  // Sign data
  async signData(data: Buffer | string, withKey: Buffer | undefined = undefined, keyPassphrase: string | undefined = undefined): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      let resolvedIdentity: Object
      if (withKey !== undefined) {
        if (keyPassphrase === undefined) {
          reject(Error('passphrase for private key was not provided'))
        }
        resolvedIdentity = await this.getIdentityFromPrivateKey(withKey, keyPassphrase!)
      } else if (this._identity !== undefined) {
        resolvedIdentity = this._identity
      } else {
        throw(Error('no identity available for signing'))
      }
      const params = {
        msg: data,
        sign_with: resolvedIdentity
      }
      kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
        if (err) {
          reject(err)
        }
        resolve(Buffer.from(result_string))
      })
    })
  }

  // Verify data
  async verifyData(data: Buffer | string, signature: Buffer, withKey: Buffer | undefined = undefined): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      var ring = new kbpgp.keyring.KeyRing;
      let resolvedIdentity: Object
      if (withKey !== undefined) {
        resolvedIdentity = await this.getIdentityFromPublicKey(withKey)
      } else if (this._identity !== undefined) {
        resolvedIdentity = this._identity
      } else {
        throw(Error('no identity available for signing'))
      }

      ring.add_key_manager(resolvedIdentity)
      const params = {
        armored: signature,
        data: data,
        keyfetch: ring
      }
      kbpgp.unbox(params, (err, literals) => {
        if (err) {
          reject(err)
        }
        let ds = literals[0].get_data_signer()
        let km: any
        if (ds) {
          km = ds.get_key_manager()
        }
        if (km) {
          resolve(km.get_pgp_fingerprint().toString('hex'));
        } else {
          reject(Error('could not verify file'))
        }
      })
    })
  }

  // Encrypt data
  async encryptData(data: Buffer, forPubKey: Buffer): Promise<string> {
    return new Promise<string>(async (resolve, reject) => {
      let resolvedIdentity: Object
      try {
        resolvedIdentity = await this.getIdentityFromPublicKey(forPubKey)
      } catch (err) {
        throw(Error(`Identity could not be resolved for encrypting: ${err}`))
      }
      const params = {
        msg: data,
        encrypt_for: resolvedIdentity
      }
      kbpgp.box(params, (err: Error, result_string: string, result_buffer: Buffer) => {
        if (err) {
          reject(err)
        }
        resolve(result_string)
      })
    })
  }

  // Encrypt data
  async decryptData(data: string, withKey: Buffer | undefined = undefined): Promise<Buffer> {
    return new Promise<Buffer>(async (resolve, reject) => {
      var ring = new kbpgp.keyring.KeyRing;
      let resolvedIdentity: Object
      if (withKey !== undefined) {
        resolvedIdentity = await this.getIdentityFromPublicKey(withKey)
      } else if (this._identity !== undefined) {
        resolvedIdentity = this._identity
      } else {
        throw(Error('no identity available for signing'))
      }

      ring.add_key_manager(resolvedIdentity)
      const params = {
        armored: data,
        keyfetch: ring
      }
      kbpgp.unbox(params, (err, literals) => {
        if (err) {
          reject(err)
        }
        try {
          const decryptedData = Buffer.from(literals[0].toString())
          resolve(decryptedData)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  getKey(): Buffer {
    return this._key
  }

  async storePrivateKey(path: string): Promise<void> {
    await fs.writeFile(path, this._keyPair.private)
  }

  async storePublicKey(path: string): Promise<void> {
    await fs.writeFile(path, this._keyPair.public)
  }

  isLoaded(): boolean {
    if (this._key) {
      return true
    }
    return false
  }
  // TODO: when storing and loading profiles you should be able to specify a location not just '~/.efs'
}

