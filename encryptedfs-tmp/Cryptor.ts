import * as fs from 'fs'
import * as crypto from 'crypto'
import * as process from 'process'
import { spawn, Worker, ModuleThread } from 'threads'
import { CryptorWorker } from './CryptorWorker'

// TODO: function docs

// interface CryptorParameters {
// 	key: Buffer | string
// 	initVector?: Buffer
// 	algorithm?: string
// 	useWebWorkers?: boolean
// }

export default class Cryptor {
	private _algorithm: string
	private readonly _initVector: Buffer
	private _key: Buffer
	private _cipher: crypto.Cipher
	private _decipher: crypto.Decipher
	private _useWebWorkers: boolean
	private _cryptorWorker?: ModuleThread<CryptorWorker>
	constructor(
		key: Buffer | string,
		initVector: Buffer = crypto.randomBytes(16),
		algorithm: string = 'aes-256-gcm',
		useWebWorkers: boolean = false
	) {
		this._algorithm = algorithm
		this._initVector = initVector
		// TODO: generate salt ?
		this._key = this._pbkdfSync(key)
		this._cipher = crypto.createCipheriv(algorithm, this._key, this._initVector)
		this._decipher = crypto.createDecipheriv(algorithm, this._key, this._initVector)
		// Async via Process or Web workers
		this._useWebWorkers = useWebWorkers
		if (this._useWebWorkers) {
			spawn<CryptorWorker>(new Worker("./CryptorWorker")).then((worker) => {
				this._cryptorWorker = worker
				this._cryptorWorker.init(this._algorithm, this._key, this._initVector)
			})
		}
	}


	encryptSync(plainBuf: crypto.BinaryLike, initVector?: Buffer): Buffer {
		if (initVector && (initVector !== this._initVector)) {
			this._resetCipherSync(initVector!)
		}
		return this._cipher.update(plainBuf)
	}

	// TODO: needs iv param
	async encrypt(plainBuf: crypto.BinaryLike, initVector: Buffer | undefined = undefined, callback: (err: NodeJS.ErrnoException | null, buffer: Buffer) => void): Promise<void> {
		if (initVector && (initVector !== this._initVector)) {
			this._resetCipher(initVector!)
		}

		let buffer: Buffer
		if (this._useWebWorkers && this._cryptorWorker) {
			buffer = await this._cryptorWorker.updateCipher(this._algorithm, this._key, this._initVector, plainBuf)
		} else {
			buffer = this._cipher.update(plainBuf)
		}
		callback(null, buffer)
	}

	decryptSync(cipherBuf: NodeJS.ArrayBufferView, initVector?: Buffer): Buffer {
		if (initVector && (initVector !== this._initVector)) {
			this._resetDecipherSync(initVector!)
		}

		return this._decipher.update(cipherBuf)
	}

	async decrypt(cipherBuf: NodeJS.ArrayBufferView, initVector: Buffer | undefined = undefined, callback: (err: NodeJS.ErrnoException | null, buffer: Buffer) => void): Promise<void> {
		if (initVector && (initVector !== this._initVector)) {
			await this._resetDecipher(initVector!)
		}

		let buffer: Buffer
		if (this._useWebWorkers && this._cryptorWorker) {
			buffer = await this._cryptorWorker.updateDecipher(this._algorithm, this._key, this._initVector, cipherBuf)
		} else {
			buffer = this._decipher.update(cipherBuf)
		}
		callback(null, buffer)
	}

	decryptCommitSync(): Buffer {
		return this._decipher.final()
	}

	async decryptCommit(): Promise<Buffer> {
		return this._decipher.final()
	}

	// TODO: should all of these be public methods?
	// ========= HELPER FUNCTIONS =============
	_resetCipherSync(initVector: crypto.BinaryLike) {
		this._cipher = crypto.createCipheriv(this._algorithm, this._key, initVector)

		return
	}

	async _resetCipher(initVector: crypto.BinaryLike) {
		if (this._useWebWorkers && this._cryptorWorker) {
			return await this._cryptorWorker._resetCipher(this._algorithm, this._key, initVector)
		} else {
			this._cipher = crypto.createCipheriv(this._algorithm, this._key, this._initVector)
		}
		return
	}

	_resetDecipherSync(initVector: crypto.BinaryLike) {
		this._decipher = crypto.createDecipheriv(this._algorithm, this._key, initVector)

		return
	}

	async _resetDecipher(initVector: crypto.BinaryLike) {
		if (this._useWebWorkers && this._cryptorWorker) {
			return await this._cryptorWorker._resetCipher(this._algorithm, this._key, initVector)
		} else {
			this._decipher = crypto.createDecipheriv(this._algorithm, this._key, this._initVector)
		}
		return
	}

	getRandomBytes(size: number): Buffer {
		return crypto.randomBytes(size)
	}

	getRandomInitVectorSync() {
		return crypto.randomBytes(16)
	}

	async getRandomInitVector(): Promise<Buffer> {
		return crypto.randomBytes(16)
	}

	_pbkdfSync(pass: crypto.BinaryLike, salt = '', algo = 'sha256', keyLen = 32, numIterations = 10000): Buffer {
		return crypto.pbkdf2Sync(pass, salt, numIterations, keyLen, algo)
	}

	async _pbkdf(pass: crypto.BinaryLike, salt = '', algo = 'sha256', keyLen = 32, numIterations = 10000, callback: (err: Error | null, key: Buffer) => void) {
		crypto.pbkdf2(pass, salt, numIterations, keyLen, algo, (err, key) => {
			callback(err, key)
		})
	}

	hashSync(data: string | Buffer, outputEncoding: 'hex' | 'latin1' |  'base64' = 'hex'): Buffer {
		const hash = crypto.createHash('sha256')
		hash.update(data)
		return hash.digest()
	}

	// TODO: should there be an input param for variable length iv?
}