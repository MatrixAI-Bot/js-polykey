import fs from 'fs'
import Cryptor from './Cryptor'
import FileDescriptor from './FileDescriptor'
import Path from 'path'
import _ from 'lodash'
import { constants, DEFAULT_FILE_PERM } from './constants'
import { EncryptedFSError, errno } from './EncryptedFSError'
import { optionsStream, ReadStream, WriteStream } from './Streams'

// TODO: conform to coding style of vfs - no blank lines, space are method definition
// TODO: are callback mandatory?
/* TODO: we need to maintain seperate permission for the lower directory vs the upper director
 * For example: if you open a file as write-only, how will you merge the block on the ct file?
 * First you need to read, overlay, then write. But we can read, since the file is write-only.
 * So the lower dir file always needs to be read-write, the upper dir file permission will be
 * whatever the user specified.
 *
 * One way to implement this is through inheriting the FileDeescriptors class.
 * Extend the class by adding another attribute for the
 */


type Metadata = {
	size: number,
	keyHash: Buffer
}


interface RmDirOptions {
	/**
	 * If `true`, perform a recursive directory removal. In
	 * recursive mode, errors are not reported if `path` does not exist, and
	 * operations are retried on failure.
	 * @experimental
	 * @default false
	 */
	recursive?: boolean
}

type CharacterEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'latin1' | 'binary' | 'hex' | undefined
type FileOptions = { 
	encoding?: CharacterEncoding | undefined, 
	mode?: number | undefined, 
	flag?: string | undefined 
}

type PathLike = string | Buffer | URL
type FileLike = string | number | Buffer
type NoParamCallback = (err: NodeJS.ErrnoException | null) => void
interface MakeDirectoryOptions {
	recursive?: boolean,
	mode?: number
}
export interface Stat {
	// Members
	dev: number
	ino: number
	mode: number
	nlink: number
	uid: number
	gid: number
	rdev: number
	size: number
	blksize: number
	blocks: number
	atime: Date
	mtime: Date
	ctime: Date
	birthtime: Date
	// Methods
	isFile(): boolean
	isDirectory(): boolean
	isBlockDevice(): boolean
	isCharacterDevice(): boolean
	isSymbolicLink(): boolean
	isFIFO(): boolean
	isSocket(): boolean
}
interface GeneralFileSystem {
	access(path: PathLike, mode: number | undefined, callback: NoParamCallback): void
	accessSync(path: PathLike, mode?: number | undefined): void
	close(fd: number, callback: NoParamCallback): void
	closeSync(fd: number): void
	write<TBuffer extends NodeJS.ArrayBufferView>(fd: number, buffer: TBuffer, offset: number | null | undefined, length: number | null | undefined, position: number | null | undefined, callback: (err: NodeJS.ErrnoException | null, written: number, buffer: TBuffer) => void): void
	writeSync(fd: number, buffer: NodeJS.ArrayBufferView, offset?: number | null | undefined, length?: number | null | undefined, position?: number | null | undefined): number
	open(path: PathLike, flags: string | number, mode: string | number | null | undefined, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void
	openSync(path: PathLike, flags: string | number, mode?: string | number | null | undefined): number
	exists(path: PathLike, callback: (exists: boolean) => void): void
	existsSync(path: PathLike): boolean
	read<TBuffer extends NodeJS.ArrayBufferView>(fd: number, buffer: TBuffer, offset: number, length: number, position: number | null, callback: (err: NodeJS.ErrnoException | null, bytesRead: number, buffer: TBuffer) => void): void
	readSync(fd: number, buffer: NodeJS.ArrayBufferView, offset: number, length: number, position: number | null): number
	appendFile(file: string | number | Buffer | URL, data: any, options: FileOptions, callback: NoParamCallback): void
	appendFileSync(file: string | number | Buffer | URL, data: any, options?: string | FileOptions | null | undefined): void
	unlink(path: PathLike, callback: NoParamCallback): void
	unlinkSync(path: PathLike): void
	open(path: PathLike, flags: string | number, mode: string | number | null | undefined, callback: (err: NodeJS.ErrnoException | null, fd: number) => void): void
	openSync(path: PathLike, flags: string | number, mode?: string | number | null | undefined): number
	readlink(path: PathLike, ...args: Array<any>): void
	readlinkSync(path: PathLike, options?: FileOptions): string | Buffer
	symlink(dstPath: PathLike, srcPath: PathLike, ...args: Array<any>): void
	symlinkSync(dstPath: PathLike, srcPath: PathLike, type: "dir" | "file" | "junction" | null | undefined): void
	link(existingPath: PathLike, newPath: PathLike, callback: NoParamCallback): void
	linkSync(existingPath: PathLike, newPath: PathLike): void
	fstat(fdIndex: number, callback: (err: NodeJS.ErrnoException | null, stat: Stat) => void): void
	fstatSync(fdIndex: number): Stat
	mkdtemp(prefix: String, options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined, callback: (err: NodeJS.ErrnoException | null, path: string | Buffer) => void): void
	mkdtempSync(prefix: String, options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined): string | Buffer
	chmod(path: PathLike, mode: number, callback: NoParamCallback): void
	chmodSync(path: PathLike, mode: number): void
	chown(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void
	chownSync(path: PathLike, uid: number, gid: number): void
	utimes(path: PathLike, atime: number | string | Date, mtime: number | string | Date, callback: NoParamCallback): void
	utimesSync(path: PathLike, atime: number | string | Date, mtime: number | string | Date): void
}
interface LowerFileSystem extends GeneralFileSystem {
	mkdir(path: PathLike, options?: MakeDirectoryOptions, callback?: (err: NodeJS.ErrnoException | null, path: PathLike) => void): void
	mkdirSync(path: PathLike, options?: MakeDirectoryOptions): string
	rmdir(path: PathLike, options: RmDirOptions | undefined, callback: NoParamCallback): void
	rmdirSync(path: PathLike, options: RmDirOptions | undefined): void
	readdirSync(path: PathLike, options?: { encoding: BufferEncoding; withFileTypes?: false } | CharacterEncoding): string[]
	stat(path: PathLike, callback: (err: NodeJS.ErrnoException | null, stats: Stat) => void): void
	statSync(path: PathLike): Stat
}
interface UpperFileSystem extends GeneralFileSystem {
	fstatSync(fd: number): Stat
	readdirSync(path: PathLike, options?: FileOptions): string[]
	exists(path: PathLike, callback: (exists: boolean) => void): void
	existsSync(path: PathLike): boolean
	write<TBuffer extends NodeJS.ArrayBufferView>(fd: number, buffer: TBuffer, offset: number | null | undefined, length: number | null | undefined, position: number | null | undefined, callback: (err: NodeJS.ErrnoException | null, written: number, buffer: TBuffer) => void): void
	writeSync(fd: number, buffer: NodeJS.ArrayBufferView, offset?: number | null | undefined, length?: number | null | undefined, position?: number | null | undefined): number
	close(fd: number, callback: NoParamCallback): void
	closeSync(fd: number): void
	mkdirp(path: PathLike, ...args: Array<any>): void
	mkdirpSync(path: PathLike, mode?: number): void
	mkdir(path: PathLike, ...args: Array<any>): void
	mkdirSync(path: PathLike, mode?: number): void
	rmdir(path: PathLike, callback: NoParamCallback): void
	rmdirSync(path: PathLike): void
	statSync(path: PathLike): Stat
	lseek(fdIndex: number, position: number, ...args: Array<any>): void
	lseekSync(fdIndex: number, position: number, seekFlags: number): void
	fallocate(fdIndex: number, offset: number, len: number, callback: NoParamCallback): void
	fallocateSync(fdIndex: number, offset: number, len: number): void
	chownr(path: PathLike, uid: number, gid: number, callback: NoParamCallback): void
	chownrSync(path: PathLike, uid: number, gid: number): void
	getCwd(): string

	lstat(path: PathLike, callback: (err: NodeJS.ErrnoException | null, stat: Stat) => void): void
	lstatSync(path: PathLike): Stat
	readdir(path: PathLike, ...args: Array<any>): void
	stat(path: PathLike, callback: (err: NodeJS.ErrnoException, stat: Stat) => void): void
	statSync(path: PathLike): Stat
	realpath(path: PathLike, ...args: Array<any>): void
	realpathSync(path: PathLike, options?: FileOptions): string | Buffer
	truncate(file: FileLike, ...args: Array<any>): void
	truncateSync(file: FileLike, len: number): void
	ftruncate(fdIndex: number, ...args: Array<any>): void
	ftruncateSync(fdIndex: number, len: number): void
	fsync(fdIndex: number, callback: NoParamCallback): void
	fsyncSync(fdIndex: number): void
	fdatasync(fdIndex: number, callback: NoParamCallback): void
	fdatasyncSync(fdIndex: number): void
	fchmod(fdIndex: number, mode: number, callback: NoParamCallback): void
	fchmodSync(fdIndex: number, mode: number): void
	fchown(fdIndex: number, uid: number, gid: number, callback: NoParamCallback): void
	fchownSync(fdIndex: number, uid: number, gid: number): void
	futimes(fdIndex: number, atime: number|string|Date, mtime: number|string|Date, callback: NoParamCallback): void
	futimesSync(fdIndex: number, atime: number|string|Date, mtime: number|string|Date): void
	rename(oldPath: PathLike, newPath: PathLike, callback: NoParamCallback): void
	renameSync(oldPath: PathLike, newPath: PathLike): void
}
interface LowerFileSystemContextControl {
	chdir(path: string): void
	setuid(uid:number): void
	setgid(gid:number): void
}
interface UpperFileSystemContextControl {
	chdir(path: string): void
	setUmask(umask: number): void
	setUid(uid:number): void
	setGid(gid:number): void
}
// interface EncryptedFSParameters {
// 	key: Buffer | string
// 	upperDir: UpperFileSystem
// 	upperDirContextControl: FSContextControl
// 	lowerDir: LowerFileSystem
// 	lowerDirContextControl: FSContextControl
// 	initVectorSize?: number
// 	blockSize?: number
// 	useWebWorkers?: boolean
//  umask?: number,
// }

/**
 * Encrypted filesystem written in TypeScript for Node.js.
 * @param key A key.
 * @param upperDir The upper directory file system.
 * @param lowerDir The lower directory file system.
 * @param initVectorSize The size of the initial vector, defaults to 16.
 * @param blockSize The size of block, defaults to 4096.
 * @param useWebWorkers Use webworkers to make crypto tasks true async, defaults to false.
 */
export default class EncryptedFS {
	// TODO: need to have per file cryptor instance
	_uid: number
	_gid: number
	_umask: number
	_upperDir: UpperFileSystem
	_upperDirContextControl: UpperFileSystemContextControl
	_lowerDir: LowerFileSystem
	_lowerDirContextControl: LowerFileSystemContextControl
	_cryptor: Cryptor
	_initVectorSize: number
	_blockSize: number
	_chunkSize: number
	_fileDescriptors: Map<number, FileDescriptor>
	_key: Buffer | string
	_keySize: number = 32
	_headerSize: number
	_metadata: {[fd: number]: Metadata}
	_useWebWorkers: boolean
	constants: any
	constructor(
		key: Buffer | string,
		upperDir: UpperFileSystem,
		upperDirContextControl: UpperFileSystemContextControl,
		lowerDir: LowerFileSystem,
		lowerDirContextControl: LowerFileSystemContextControl,
		umask = 0o022,
		initVectorSize = 16,
		blockSize = 4096, 
		useWebWorkers = false
	) {
		this._umask = umask
		this._key = key
		this._cryptor = new Cryptor(key, undefined, undefined, useWebWorkers)
		this._upperDir = upperDir
		this._upperDirContextControl = upperDirContextControl
		this._lowerDir = lowerDir
		this._lowerDirContextControl = lowerDirContextControl
		this._initVectorSize = initVectorSize
		this._blockSize = blockSize
		this._chunkSize = this._blockSize + this._initVectorSize
		this._fileDescriptors = new Map()
		this._headerSize = this._blockSize
		this._metadata = {}
		this._useWebWorkers = useWebWorkers
		this.constants = constants
	}

	/**
	 * Synchronously tests a user's permissions for the file specified by path.
	 * @param fd number. File descriptor.
	 * @returns void.
	 */
	accessSync(
		path: PathLike,
		mode: number = 0o666
	): void {
		this._upperDir.accessSync(path, mode)
		this._lowerDir.accessSync(path, mode)
	}

	getUmask(): number {
		return this._umask
	}
	
	setUmask(umask: number): void {
		this._upperDirContextControl.setUmask(umask)
		this._umask = umask
	}
	
	getUid(): number {
		return this._uid
	}
	
	setUid(uid:number): void {
		this._upperDirContextControl.setUid(uid)
		this._uid = uid
	}
	
	getGid(): number {
		return this._gid
	}
	
	setGid(gid:number): void {
		this._upperDirContextControl.setGid(gid)
		this._gid = gid
	}

	getCwd(): string {
		return this._upperDir.getCwd()
	}
	
	// TODO: nodejs fs (i.e. _lowerDir) does not have a native method for changing directory and depends on process.chdir(...)
	// which seems a little too much like a global change. We could also just keep track of the cwd in upperDir (vfs) and then
	// every time there is an operation using _lowerDir, we just prepend this cwd to the path.
	chdir(path: string): void {
		this._upperDirContextControl.chdir(path)
	}

	/**
	 * Asynchronously tests a user's permissions for the file specified by path with a callback.
	 * @param fd number. File descriptor.
	 * @param callback NoParamCallback.
	 * @returns Promise<void>.
	 */
	async access(
		path: PathLike,
		mode: number = 0,
		callback: NoParamCallback
	): Promise<void> {
		this._upperDir.access(
			path,
			mode,
			(err: Error) => {
				callback(err)
			},
		)
	}

	/**
	 * Asynchronously retrieves the path stats in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	lstat(
		path: PathLike, 
		callback: NoParamCallback
	): void {
		return this._upperDir.lstat(path, callback)
	}

	/**
	 * Synchronously retrieves the path stats in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	lstatSync(
		path: PathLike
	): Stat {
		return this._upperDir.lstatSync(path)
	}

	/**
	 * Asynchronously makes the directory in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param mode number | undefined. Permissions or mode.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	mkdir(
		path: PathLike,
		options: MakeDirectoryOptions = {mode: 0o777, recursive: false},
		callback: NoParamCallback
	): void {
		this._lowerDir.mkdir(path, options, (err) => {
			if (options.recursive) {
				this._upperDir.mkdirp(path, options.mode, (err: NodeJS.ErrnoException | null) => {
					callback(err)
				})
			} else {
				this._upperDir.mkdir(path, options.mode, (err: NodeJS.ErrnoException | null) => {
					callback(err)
				})
			}
		})
	}

	/**
	 * Synchronously makes the directory in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param mode number | undefined. Permissions or mode.
	 * @returns void.
	 */
	mkdirSync(
		path: PathLike,
		options: MakeDirectoryOptions = {mode: 0o777, recursive: false}
	): void {
		this._lowerDir.mkdirSync(path, options)
		if (options.recursive) {
			this._upperDir.mkdirpSync(path, options.mode)
		} else {
			this._upperDir.mkdirSync(path, options.mode)
		}
	}

	/**
	 * Synchronously makes a temporary directory with the prefix given.
	 * @param prefix string. Prefix of temporary directory.
	 * @param options { encoding: CharacterEncoding } | CharacterEncoding | null | undefined
	 * @param callback (err: NodeJS.Errno.Exception) => void.
	 * @returns void.
	 */
	mkdtemp(
		prefix: string,
		options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined = 'utf8',
		callback: (err: NodeJS.ErrnoException | null, path: string) => void
	): void {
		return this._upperDir.mkdtemp(prefix, options, (err, path) => {
			if (err) {
				callback(err, path.toString())
			} else {
				this._lowerDir.mkdtemp(prefix, options, (err, path) => {
					callback(err, path.toString())
				})
			}
		})
	}

	/**
	 * Synchronously makes a temporary directory with the prefix given.
	 * @param prefix string. Prefix of temporary directory.
	 * @param options { encoding: CharacterEncoding } | CharacterEncoding | null | undefined
	 * @returns void.
	 */
	mkdtempSync(
		prefix: string,
		options: { encoding: CharacterEncoding } | CharacterEncoding | null | undefined = 'utf8'
	): string {
		const lowerPath = this._lowerDir.mkdtempSync(prefix, options)
		const lowerStat = this._lowerDir.statSync(lowerPath)
		this._upperDir.mkdirpSync(lowerPath, lowerStat.mode)
		return <string>lowerPath
		// const upperPath = this._upperDir.mkdtempSync(prefix, options)
		// const upperStat = this._upperDir.statSync(upperPath)
		// this._lowerDir.mkdirSync(upperPath, { recursive: true, mode: upperStat.mode})
		// return <string>upperPath
	}

	/**
	 * Asynchronously retrieves  in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	stat(
		path: PathLike, 
		callback: (err: NodeJS.ErrnoException, stat: Stat) => void
	): void {
		return this._upperDir.stat(path, callback)
	}

	/**
	 * Asynchronously retrieves  in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	statSync(
		path: PathLike
	): Stat {
		return this._upperDir.statSync(path)
	}

	/**
	 * Asynchronously removes the directory in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param options: { recursive: boolean }.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	rmdir(
		path: PathLike,
		options: RmDirOptions | undefined = undefined,
		callback: NoParamCallback
	): void {
		// TODO: rmdir on VFS doesn't have an option to recusively delete
		if (options?.recursive) {
			this._lowerDir.rmdir(path, options, callback)
		} else {
			return this._upperDir.rmdir(path, (err) => {
				if (err) {
					callback(err)
				} else {
					this._lowerDir.rmdir(path, options, callback)
				}
			})
		}
	}

	/**
	 * Synchronously removes the directory in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param options: { recursive: boolean }.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	rmdirSync(
		path: PathLike,
		options: RmDirOptions | undefined = undefined
	): void {
		// TODO: rmdirSync on VFS doesn't have an option to recusively delete
		if (!options?.recursive) {
			this._upperDir.rmdirSync(path)
		}
		this._lowerDir.rmdirSync(path, options)
	}

	/**
	 * Asynchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
	 * @param dstPath string. Destination path.
	 * @param srcPath string. Source path.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	symlink(
		dstPath: PathLike,
		srcPath: PathLike,
		type: string,
		callback: NoParamCallback
	): void {
		return this._upperDir.symlink(dstPath, srcPath, type, (err) => {
			this._lowerDir.symlink(dstPath, srcPath, type, (err) => {
				callback(err)
			})
		})
	}

	/**
	 * Synchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
	 * @param dstPath string. Destination path.
	 * @param srcPath string. Source path.
	 * @returns void.
	 */
	symlinkSync(
		dstPath: PathLike,
		srcPath: PathLike,
		type: "dir" | "file" | "junction" | null | undefined = 'file'
	): void {
		this._upperDir.symlinkSync(dstPath, srcPath, type)
		this._lowerDir.symlinkSync(dstPath, srcPath, type)
	}

	/**
	 * Synchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
	 * @param dstPath string. Destination path.
	 * @param srcPath string. Source path.
	 * @returns void.
	 */
	truncateSync(
		file: FileLike,
		len: number = 0
	): void {
		return this._upperDir.truncateSync(file, len)
	}

	/**
	 * Asynchronously unlinks the given path in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	unlink(
		path: PathLike,
		callback: NoParamCallback
	): void {
		return this._upperDir.unlink(path, callback)
	}

	/**
	 * Synchronously unlinks the given path in the upper file system directory. Propagates upper fs method.
	 * @param path string. Path to create.
	 * @param callback (err: NodeJS.ErrnoException | null) => void.
	 * @returns void.
	 */
	unlinkSync(
		path: PathLike
	): void {
		return this._upperDir.unlinkSync(path)
	}
	
	/**
	 * Asynchronously changes the access and modification times of the file referenced by path.
	 * @param path string. Path to file.
	 * @param atime number | string | Date. Access time.
	 * @param mtime number | string | Date. Modification time.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	utimes(
		path: PathLike,
		atime: number | string | Date,
		mtime: number | string | Date,
		callback: NoParamCallback
	): void {
		return this._upperDir.utimes(path, atime, mtime, callback)
	}
	
	/**
	 * Synchronously changes the access and modification times of the file referenced by path.
	 * @param path string. Path to file.
	 * @param atime number | string | Date. Access time.
	 * @param mtime number | string | Date. Modification time.
	 * @returns void.
	 */
	utimesSync(
		path: PathLike,
		atime: number | string | Date,
		mtime: number | string | Date
	): void {
		this._upperDir.utimesSync(path, atime, mtime)
		this._lowerDir.utimesSync(path, atime, mtime)
	}

	/**
	 * Asynchronously closes the file descriptor with a callback.
	 * @param fd number. File descriptor.
	 * @returns Promise<void>.
	 */
	close(
		fd: number,
		callback: Function
	): void {
		const lowerFd = this._getLowerFd(fd)
		this._lowerDir.close(
			lowerFd,
			err => {
				if (err) {
					console.log(`error: ${err}`)
				}
				this._upperDir.close(
					fd,
					(err: Error) => {
						this._fileDescriptors.delete(fd)
						callback(null)
					},
				)
			},
		)
	}
	
	/**
	 * Synchronously closes the file descriptor.
	 * @param fd number. File descriptor.
	 * @returns void.
	 */
	closeSync(fd: number): void {
		const lowerFd = this._getLowerFd(fd)
		this._lowerDir.closeSync(lowerFd)
		this._upperDir.closeSync(fd)
		this._fileDescriptors.delete(fd)
	}

	/**
	 * Synchronously writes buffer (with length) to the file descriptor at an offset and position.
	 * @param path string. Path to directory to be read.
	 * @param options FileOptions.
	 * @returns string[] (directory contents).
	 */
	readdir(
		path: PathLike,
		options: FileOptions | undefined = undefined,
		callback: (err: NodeJS.ErrnoException, contents: string[]) => void
	): void {
		return this._upperDir.readdir(path, options=options, callback=callback)
	}

	/**
	 * Synchronously writes buffer (with length) to the file descriptor at an offset and position.
	 * @param path string. Path to directory to be read.
	 * @param options FileOptions.
	 * @returns string[] (directory contents).
	 */
	readdirSync(
		path: PathLike,
		options: FileOptions | undefined = undefined
	): string[] {
		return this._upperDir.readdirSync(path, options)
	}
	
	/**
	 * Creates a read stream from the given path and options.
	 * @param path string.
	 * @param callback: (exists: boolean) => void
	 * @returns boolean.
	 */
	createReadStream(
		path: PathLike,
		options: optionsStream | undefined
	): ReadStream {
		path = this._getPath(path)
		options = this._getStreamOptions(
		  {
			flags: 'r',
			encoding: undefined,
			fd: null,
			mode: DEFAULT_FILE_PERM,
			autoClose: true,
			end: Infinity
		  },
		  options
		)
		if (options.start !== undefined) {
			if (options.start > options.end!) {
				throw new RangeError('ERR_VALUE_OUT_OF_RANGE')
			}
		}
		return new ReadStream(path, options, this)
	}
	
	/**
	 * Creates a write stream from the given path and options.
	 * @param path string.
	 * @param callback: (exists: boolean) => void
	 * @returns boolean.
	 */
	createWriteStream(
		path: PathLike,
		options: optionsStream | undefined
	): WriteStream {
		path = this._getPath(path)
		options = this._getStreamOptions(
		  {
			flags: 'w',
			encoding: 'utf8',
			fd: null,
			mode: DEFAULT_FILE_PERM,
			autoClose: true
		  },
		  options
		)
		if (options.start !== undefined) {
			if (options.start < 0) {
				throw new RangeError('ERR_VALUE_OUT_OF_RANGE')
			}
		}
		return new WriteStream(path, options, this)
	}
	
	/**
	 * Synchronously checks if path exists.
	 * @param path string.
	 * @param callback: (exists: boolean) => void
	 * @returns boolean.
	 */
	exists(
		path: PathLike,
		callback: (exists: boolean) => void
	): void {
		return this._upperDir.exists(path, callback=callback)
	}
	
	/**
	 * Synchronously checks if path exists.
	 * @param path string.
	 * @returns boolean.
	 */
	existsSync(
		path: PathLike
	): boolean {
		return this._upperDir.existsSync(path)
	}
	
	/**
	 * Asynchronously manipulates the allocated disk space for a file.
	 * @param fdIndex number. File descriptor index.
	 * @param offset number. Offset to start manipulations from.
	 * @param len number. New length for the file.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	fallocate(
		fdIndex: number,
		offset: number,
		len: number,
		callback: NoParamCallback
	): void {
		return this._upperDir.fallocate(fdIndex, offset, len, callback)
	}
	
	/**
	 * Synchronously manipulates the allocated disk space for a file.
	 * @param fdIndex number. File descriptor index.
	 * @param offset number. Offset to start manipulations from.
	 * @param len number. New length for the file.
	 * @returns void.
	 */
	fallocateSync(
		fdIndex: number,
		offset: number,
		len: number
	): void {
		return this._upperDir.fallocateSync(fdIndex, offset, len)
	}
	
	/**
	 * Asynchronously changes the permissions of the file referred to by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @param mode number. New permissions set.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	fchmod(
		fdIndex: number,
		mode: number = 0,
		callback: NoParamCallback
	): void {
		return this._upperDir.fchmod(fdIndex, mode, callback)
	}
	
	/**
	 * Synchronously changes the permissions of the file referred to by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @param mode number. New permissions set.
	 * @returns void.
	 */
	fchmodSync(
		fdIndex: number,
		mode: number = 0
	): void {
		return this._upperDir.fchmodSync(fdIndex, mode)
	}
	
	/**
	 * Asynchronously changes the owner or group of the file referred to by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	fchown(
		fdIndex: number,
		uid: number,
		gid: number,
		callback: NoParamCallback
	): void {
		return this._upperDir.fchown(fdIndex, uid, gid, callback)
	}
	
	/**
	 * Synchronously changes the owner or group of the file referred to by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @returns void.
	 */
	fchownSync(
		fdIndex: number,
		uid: number,
		gid: number
	): void {
		return this._upperDir.fchownSync(fdIndex, uid, gid)
	}
	
	/**
	 * Asynchronously flushes in memory data to disk. Not required to update metadata.
	 * @param fdIndex number. File descriptor index.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	fdatasync(
		fdIndex: number,
		callback: NoParamCallback
	): void {
		return this._upperDir.fdatasync(fdIndex, callback)
	}
	
	/**
	 * Synchronously flushes in memory data to disk. Not required to update metadata.
	 * @param fdIndex number. File descriptor index.
	 * @returns void.
	 */
	fdatasyncSync(
		fdIndex: number
	): void {
		return this._upperDir.fdatasyncSync(fdIndex)
	}
	
	/**
	 * Asynchronously retrieves data about the file described by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @param callback (err: NodeJS.ErrnoException, stat: Stat) => void.
	 * @returns void.
	 */
	fstat(
		fdIndex: number,
		callback: (err: NodeJS.ErrnoException, stat: Stat) => void
	): void {
		return this._upperDir.fstat(fdIndex, callback)
	}
	
	/**
	 * Synchronously retrieves data about the file described by fdIndex.
	 * @param fdIndex number. File descriptor index.
	 * @returns void.
	 */
	fstatSync(
		fdIndex: number
	): Stat {
		return this._upperDir.fstatSync(fdIndex)
	}
	
	/**
	 * Synchronously flushes all modified data to disk.
	 * @param fdIndex number. File descriptor index.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	fsync(
		fdIndex: number,
		callback: NoParamCallback
	): void {
		return this._upperDir.fsync(fdIndex, callback)
	}
	
	/**
	 * Synchronously flushes all modified data to disk.
	 * @param fdIndex number. File descriptor index.
	 * @returns void.
	 */
	fsyncSync(
		fdIndex: number
	): void {
		return this._upperDir.fsyncSync(fdIndex)
	}
	
	/**
	 * Asynchronously truncates to given length.
	 * @param fdIndex number. File descriptor index
	 * @param len number. Length to truncate to.
	 * @returns void.
	 */
	ftruncate(
		fdIndex: number,
		len: number = 0,
		callback: NoParamCallback
	): void {
		return this._upperDir.ftruncate(fdIndex, len=len, callback=callback)
	}
	
	/**
	 * Synchronously truncates to given length.
	 * @param fdIndex number. File descriptor index
	 * @param len number. Length to truncate to.
	 * @returns void.
	 */
	ftruncateSync(
		fdIndex: number,
		len: number = 0
	): void {
		return this._upperDir.ftruncateSync(fdIndex, len)
	}
	
	/**
	 * Asynchronously changes the access and modification times of the file referenced by fdIndex.
	 * @param fdIndex number. File descriptor index
	 * @param atime number | string | Date. Access time.
	 * @param mtime number | string | Date. Modification time.
	 * @returns void.
	 */
	futimes(
		fdIndex: number,
		atime: number | string | Date,
		mtime: number | string | Date,
		callback: NoParamCallback
	): void {
		return this._upperDir.futimes(fdIndex, atime, mtime, callback)
	}
	
	/**
	 * Synchronously changes the access and modification times of the file referenced by fdIndex.
	 * @param fdIndex number. File descriptor index
	 * @param atime number | string | Date. Access time.
	 * @param mtime number | string | Date. Modification time.
	 * @returns void.
	 */
	futimesSync(
		fdIndex: number,
		atime: number | string | Date,
		mtime: number | string | Date
	): void {
		return this._upperDir.futimesSync(fdIndex, atime, mtime)
	}
	
	/**
	 * Synchronously links a path to a new path.
	 * @param existingPath string.
	 * @param newPath string.
	 * @param callback: (err: NodeJS.ErrnoException | null) => void
	 * @returns void.
	 */
	link(
		existingPath: PathLike,
		newPath: PathLike,
		callback: NoParamCallback
	): void {
		return this._lowerDir.link(existingPath, newPath, (err) => {
			this._upperDir.link(existingPath, newPath, (err) => {
				callback(err)
			})
		})
	}
	
	/**
	 * Synchronously links a path to a new path.
	 * @param existingPath string.
	 * @param newPath string.
	 * @returns void.
	 */
	linkSync(
		existingPath: PathLike,
		newPath: PathLike
	): void {
		this._lowerDir.linkSync(existingPath, newPath)
		this._upperDir.linkSync(existingPath, newPath)
	}
	
	/**
	 * Asynchronously seeks a link to the fd index provided.
	 * @param fdIndex number.
	 * @param position number.
	 * @param seekFlags number.
	 * @param callback: (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	lseek(
		fdIndex: number,
		position: number,
		seekFlags: number = constants.SEEK_SET,
		callback: NoParamCallback
	): void {
		return this._upperDir.lseek(fdIndex, position, seekFlags=seekFlags, callback=callback)
	}
	
	/**
	 * Synchronously seeks a link to the fd index provided.
	 * @param fdIndex number.
	 * @param position number.
	 * @param seekFlags number.
	 * @returns void.
	 */
	lseekSync(
		fdIndex: number,
		position: number,
		seekFlags: number = constants.SEEK_SET
	): void {
		return this._upperDir.lseekSync(fdIndex, position, seekFlags)
	}

	/**
	 * Synchronously reads data from a file given the path of that file.
	 * @param path string. Path to file.
	 * @returns void.
	 */
	readFile(
		path: string,
		options: FileOptions | undefined = undefined,
		callback: (error: NodeJS.ErrnoException | null, data: string | Buffer | undefined) => void
	): void {
		let fd: number | undefined = undefined
		let data: string | Buffer | undefined = undefined
		try {
			fd = this.openSync(path, "r")
			const size = this._getMetadata(fd).size
			const readBuffer = Buffer.allocUnsafe(size)
			this.readSync(fd, readBuffer, 0, size, 0)
			data = (options && options.encoding) ? readBuffer.toString(options.encoding) : readBuffer
			callback(null, data)
		} catch (err) {
			callback(err, data)
		} finally {
			if (fd !== undefined) this.closeSync(fd)
		}
	}

	/**
	 * Synchronously reads data from a file given the path of that file.
	 * @param path string. Path to file.
	 * @returns Buffer (read buffer).
	 */
	readFileSync(
		path: PathLike, 
		options: FileOptions | undefined
	): string | Buffer {
		let fd: number | undefined = undefined
		try {
			fd = this.openSync(path, "r")
			const size = this._getMetadata(fd).size
			const readBuffer = Buffer.allocUnsafe(size)
			this.readSync(fd, readBuffer, 0, size, 0)
			return (options && options.encoding) ? readBuffer.toString(options.encoding) : readBuffer
		} finally {
			if (fd !== undefined) this.closeSync(fd)
		}
	}

	/**
	 * Synchronously reads link of the given the path. Propagated from upper fs.
	 * @param path string. Path to file.
	 * @param options FileOptions | undefined.
	 * @param callback (err: NodeJS.ErrnoException, data: Buffer | string) => void.
	 * @returns void.
	 */
	readlink(
		path: PathLike, 
		options: FileOptions | undefined = undefined,
		callback: (err: NodeJS.ErrnoException, data: Buffer | string) => void
	): void {
		return this._upperDir.readlink(path, options=options, callback=callback)
	}

	/**
	 * Synchronously reads link of the given the path. Propagated from upper fs.
	 * @param path string. Path to file.
	 * @param options FileOptions | undefined.
	 * @returns string | Buffer.
	 */
	readlinkSync(
		path: PathLike, 
		options: FileOptions | undefined = undefined
	): string | Buffer {
		return this._upperDir.readlinkSync(path, options)
	}

	/**
	 * Synchronously reads link of the given the path. Propagated from upper fs.
	 * @param path string. Path to file.
	 * @param options FileOptions | undefined.
	 * @param callback: (err: NodeJS.ErrnoException, path: string | Buffer) => void
	 * @returns void.
	 */
	realpath(
		path: PathLike, 
		options: FileOptions | undefined = undefined,
		callback: (err: NodeJS.ErrnoException, path: string | Buffer) => void
	): void {
		return this._upperDir.realpath(path, options=options, callback=callback)
	}

	/**
	 * Synchronously reads link of the given the path. Propagated from upper fs.
	 * @param path string. Path to file.
	 * @param options FileOptions | undefined.
	 * @returns Buffer (read buffer).
	 */
	realpathSync(
		path: PathLike, 
		options: FileOptions | undefined = undefined
	): string | Buffer {
		return this._upperDir.realpathSync(path, options)
	}

	/**
	 * Asynchronously renames the file system object described by oldPath to the given new path. Propagated from upper fs.
	 * @param oldPath string. Old path.
	 * @param oldPath string. New path.
	 * @param callback: (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	rename(
		oldPath: PathLike,
		newPath: PathLike,
		callback: NoParamCallback
	): void {
		return this._upperDir.rename(oldPath, newPath, callback)
	}

	/**
	 * Synchronously renames the file system object described by oldPath to the given new path. Propagated from upper fs.
	 * @param oldPath string. Old path.
	 * @param oldPath string. New path.
	 * @returns void.
	 */
	renameSync(
		oldPath: PathLike,
		newPath: PathLike
	): void {
		return this._upperDir.renameSync(oldPath, newPath)
	}

	/**
	 * Asynchronously reads data at an offset, position and length from a file descriptor into a given buffer.
	 * @param fd number. File descriptor.
	 * @param buffer Buffer. Buffer to be written from.
	 * @param offset number. Offset of the data.
	 * @param length number. Length of data to write.
	 * @param position number. Where to start writing.
	 * @param callback (error: NodeJS.ErrnoException | null, length: number, buffer: Buffer) => void
	 * @returns Promise<void>.
	 */
	read(
		fd: number,
		buffer: Buffer, 
		offset: number = 0,
		length: number = 0,
		position: number = 0,
		callback: (error: NodeJS.ErrnoException | null, length: number, buffer: Buffer) => void
	): void {
		const numChunksToRead = Math.ceil(length / this._blockSize)
		const startChunkNum = this._offsetToBlockNum(position)
		const plaintextBlocks: Buffer[] = []
		const chunkBuf = Buffer.allocUnsafe(numChunksToRead * this._chunkSize)
		const lowerFd = this._getLowerFd(fd)
		this._lowerDir.read(
			lowerFd,
			chunkBuf,
			0,
			numChunksToRead * this._chunkSize,
			this._chunkNumToOffset(startChunkNum),
			(err, bytesWritten, buffer) => {
				const chunkIter = this._chunkGenerator(buffer)
				let chunk: Buffer
				for (chunk of chunkIter) {
					const iv = chunk.slice(0, this._initVectorSize)
			
					const chunkData = chunk.slice(this._initVectorSize)
					const plaintextBlock = this._cryptor.decryptSync(chunkData, iv)
					plaintextBlocks.push(plaintextBlock)
				}
				const decryptedReadBuffer = Buffer.concat(
					plaintextBlocks,
					numChunksToRead * this._blockSize,
				)
		
				const startBlockOffset = position & this._blockSize - 1
		
				decryptedReadBuffer.copy(buffer, offset, startBlockOffset, length)
				callback(null, buffer.length, buffer)
			},
		)
	}
	
	// TODO: validation of the params?
	// TODO: what to do if buffer is less than 4k? truncate?
	// TODO: what happens if length is larger than buffer?
	// So if the file contains a 100 bytes, and you read 4k, then you will read those 100 into
	// the buffer at the specified offset. But after those 100 bytes, what ever was in the buffer will remain
	/**
	 * Synchronously reads data at an offset, position and length from a file descriptor into a given buffer.
	 * @param fd number. File descriptor.
	 * @param buffer Buffer. Buffer to be read into.
	 * @param offset number. Offset of the data.
	 * @param length number. Length of data to write.
	 * @param position number. Where to start writing.
	 * @returns number (length).
	 */
	readSync(
		fd: number,
		buffer: Buffer,
		offset: number = 0,
		length: number = 0,
		position: number = 0,
	): number {
		// TODO: actually use offset, length and position

		// length is specified for plaintext file, but we will be reading from encrypted file
		// hence the inclusion of 'chunks' in variable name
		const numChunksToRead = Math.ceil(length / this._blockSize)
		// 1. find out block number the read offset it at
		// 2. blocknum == chunknum so read entire chunk and get iv
		// 3. decrypt chunk with attaned iv.
		//
		// TODO: maybe actually better to call is a chunk
		const startChunkNum = this._offsetToBlockNum(position)
		let chunkCtr = 0
		const plaintextBlocks: Buffer[] = []
		const lowerFd = this._getLowerFd(fd)
		const metadata = this._getMetadata(fd)
		if (position + length > metadata.size) {
		  length = metadata.size - position
		}
	
		for (const chunkNum = startChunkNum; chunkCtr < numChunksToRead; chunkCtr++) {
			const chunkOffset = this._chunkNumToOffset(chunkNum + chunkCtr)
			let chunkBuf = Buffer.alloc(this._chunkSize)

			this._lowerDir.readSync(lowerFd, chunkBuf, 0, this._chunkSize, chunkOffset)
			
			// extract the iv from beginning of chunk
			const iv = chunkBuf.slice(0, this._initVectorSize)
			// extract remaining data which is the cipher text
			const chunkData = chunkBuf.slice(this._initVectorSize)
			const ptBlock = this._cryptor.decryptSync(chunkData, iv)
			plaintextBlocks.push(ptBlock)
		}
		const decryptedReadBuffer = Buffer.concat(
			plaintextBlocks,
			numChunksToRead * this._blockSize,
		)
	
		// offset into the decryptedReadBuffer to read from
		const startBlockOffset = position & this._blockSize - 1
	
		decryptedReadBuffer.copy(buffer, offset, startBlockOffset, length)
	
		/*

		// TODO: we never use buffer from param
		// read entire chunk 'position' belongs to
		let chunkBuf = Buffer.alloc(this._chunkSize)
		// remember every chunk_i is associated with block_i, for integer i
		// i.e. startChunkNum and chunkNum can be used interchangably
		const startChunkOffset = startChunkNum * this._chunkSize
		fs.readSync(fd, chunkBuf, 0, this._chunkSize, startChunkOffset)

		// extract iv
		const iv = chunkBuf.slice(0, this._ivSize)
		const blockBuf = chunkBuf.slice(this._ivSize, chunkBuf.length)

		const ptBlock = this._cryptor.decryptSync(blockBuf, iv)

		// TODO: is this the most efficient way? Can we make do without the copy?
		ptBlock.copy(buffer, offset, position, length)
		*/

		/* TODO: this is not an accurate measure of bytesRead.
		 : find out in what cases bytesRead will be less than read
		 : one case is when you read more than the file contains
		 : in this case we may need a special eof marker or some meta
		 : data about the plain text
		 */
		return length
	}

	// TODO: actaully use offset.
	/**
	 * Asynchronously writes buffer (with length) to the file descriptor at an offset and position.
	 * @param fd number. File descriptor.
	 * @param buffer Buffer. Buffer to be written from.
	 * @param offset number. Offset of the data.
	 * @param length number. Length of data to write.
	 * @param position number. Where to start writing.
	 * @param callback (error: NodeJS.ErrnoException | null, length: number, buffer: Buffer) => void
	 * @returns Promise<void>.
	 */
	write(
		fd: number,
		data: Buffer | string,
		offset: number | undefined = undefined,
		length: number | undefined = undefined,
		position: number | undefined = undefined,
		callback: (error: NodeJS.ErrnoException | null, length: number, buffer: Buffer) => void
	): void {
		// Define defaults
		const buffer = (typeof data === 'string') ? Buffer.from(data) : data
		offset = offset !== undefined ? offset : 0
		length = length !== undefined ? length : buffer.length
		position = position !== undefined ? position : 0

		const efsFd = this._fileDescriptors.get(fd)
		const lowerFd = this._getLowerFd(fd)
	
		const boundaryOffset = position & this._blockSize - 1
		const numBlocksToWrite = Math.ceil(
		  (length + boundaryOffset) / this._blockSize,
		)
		const startBlockNum = this._offsetToBlockNum(position)
		const endBlockNum = startBlockNum + numBlocksToWrite - 1
		const startBlockOverlaySize = this._blockSize - boundaryOffset
		const startBlockOverlay = buffer.slice(offset, startBlockOverlaySize)
		let startBlock = this._overlaySegment(fd, startBlockOverlay, position)
		let middleBlocks = Buffer.allocUnsafe(0)
		let endBlock = Buffer.allocUnsafe(0)
		let endBlockBufferOffset: number = 0
		if (numBlocksToWrite >= 2) {
		  endBlockBufferOffset = startBlockOverlaySize + (numBlocksToWrite - 2) * this._blockSize
		  const endBlockOverlay = buffer.slice(offset + endBlockBufferOffset)
	
		  const endBlockOffset = this._blockNumToOffset(endBlockNum)
	
		  endBlock = this._overlaySegment(fd, endBlockOverlay, endBlockOffset)
		}
		if (numBlocksToWrite >= 3) {
		  middleBlocks = buffer.slice(startBlockOverlaySize, endBlockBufferOffset)
		}
	
		const newBlocks = Buffer.concat([startBlock, middleBlocks, endBlock])
		this._upperDir.write(
		  fd,
		  newBlocks,
		  0,
		  newBlocks.length,
		  this._blockNumToOffset(startBlockNum),
		  (err: NodeJS.ErrnoException, bytesWritten: number, writeBuf: Buffer) => {
			const blockIter = this._blockGenerator(newBlocks)
			const encryptedChunks: Buffer[] = []
			for (let block of blockIter) {
			  const iv = this._cryptor.getRandomInitVectorSync()
			  const ctBlock = this._cryptor.encryptSync(block, iv)
	
			  const chunk = Buffer.concat([iv, ctBlock], this._chunkSize)
			  encryptedChunks.push(chunk)
			}
	
			const encryptedWriteBuffer = Buffer.concat(
			  encryptedChunks,
			  numBlocksToWrite * this._chunkSize,
			)
			const lowerWritePos = this._chunkNumToOffset(startBlockNum)

			this._lowerDir.write(
			  lowerFd,
			  encryptedWriteBuffer,
			  0,
			  encryptedWriteBuffer.length,
			  lowerWritePos,
			  (err, bytesWritten, writeBuf) => {
				if (err) {
				  console.log(`error: ${err}`)
				}
				if (callback !== undefined) {
					callback(null, length!, buffer)
				}
			  },
			)
		  },
		)
	}

	// TODO: actaully use offset.
	/**
	 * Synchronously writes buffer (with length) to the file descriptor at an offset and position.
	 * @param fd number. File descriptor.
	 * @param buffer Buffer. Buffer to be written from.
	 * @param offset number. Offset of the data.
	 * @param length number. Length of data to write.
	 * @param position number. Where to start writing.
	 * @returns number (length).
	 */
	writeSync(
		fd: number,
		data: Buffer | string,
		offset?: number,
		length?: number,
		position?: number
	): number {
		// Define defaults
		const buffer = (typeof data === 'string') ? Buffer.from(data) : data
		offset = offset !== undefined ? offset : 0
		length = length !== undefined ? length : buffer.length
		position = position !== undefined ? position : 0

		const efsFd = this._fileDescriptors.get(fd)
		const lowerFd = this._getLowerFd(fd)
		// Get block boundary conditions
		const boundaryOffset = position & this._blockSize - 1 // how far from a block boundary our write is
		const numBlocksToWrite = Math.ceil((length + boundaryOffset) / this._blockSize)
		const startBlockNum = this._offsetToBlockNum(position)
		const endBlockNum = startBlockNum + numBlocksToWrite - 1
		// Get overlay conditions
		const startBlockOverlaySize = this._blockSize - boundaryOffset
		// TODO: this should not be using the offsets. That pertains to the file, not this buffer.
		const startBlockOverlay = buffer.slice(offset, startBlockOverlaySize)
		let startBlock = this._overlaySegment(fd, startBlockOverlay, position)
		let middleBlocks = Buffer.allocUnsafe(0)
		let endBlock = Buffer.allocUnsafe(0)
		// only bother if there is a last chunk
		let endBlockBufferOffset: number = 0
		if (numBlocksToWrite >= 2) {
			endBlockBufferOffset = startBlockOverlaySize + (numBlocksToWrite - 2) * this._blockSize
			const endBlockOverlay = buffer.slice(offset + endBlockBufferOffset)
		
			const endBlockOffset = this._blockNumToOffset(endBlockNum)
		
			endBlock = this._overlaySegment(fd, endBlockOverlay, endBlockOffset)
		}
		// slice out middle blocks if they actually exist
		if (numBlocksToWrite >= 3) {
			middleBlocks = buffer.slice(startBlockOverlaySize, endBlockBufferOffset)
		}
	
		// TODO: assert newBlocks is a multiple of blocksize
		const newBlocks = Buffer.concat([startBlock, middleBlocks, endBlock])
		this._upperDir.writeSync(
			fd,
			newBlocks,
			0,
			newBlocks.length,
			this._blockNumToOffset(startBlockNum),
		)
		const blockIter = this._blockGenerator(newBlocks)
		const encryptedChunks: Buffer[] = []
		for (let block of blockIter) {
		  const iv = this._cryptor.getRandomInitVectorSync()
		  const ctBlock = this._cryptor.encryptSync(block, iv)
	
		  const chunk = Buffer.concat([iv, ctBlock], this._chunkSize)
		  encryptedChunks.push(chunk)
		}
		const encryptedWriteBuffer = Buffer.concat(
		  encryptedChunks,
		  numBlocksToWrite * this._chunkSize,
		)
		const lowerWritePos = this._chunkNumToOffset(startBlockNum)
	
		this._lowerDir.writeSync(
		  lowerFd,
		  encryptedWriteBuffer,
		  0,
		  encryptedWriteBuffer.length,
		  lowerWritePos,
		)
		const newFileSize = position + length
		if (newFileSize > this._getMetadata(fd).size) {
		  this._getMetadata(fd).size = newFileSize
		  this._writeMetadataSync(fd)
		}
	
		return length
	}
	
	/**
	 * Asynchronously append data to a file, creating the file if it does not exist.
	 * @param path string | number. Path to the file or directory.
	 * @param data string | Buffer. The data to be appended.
	 * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined }. 
	 * Default options are: { encoding: "utf8", mode: 0o666, flag: "w" }.
	 * @returns Promise<void>.
	 */
	async appendFile(
		path: PathLike, 
		data: Buffer, 
		options: (FileOptions | NoParamCallback), 
		callback?: NoParamCallback
	): Promise<void> {
		if (!callback && typeof options === 'function') {
		  callback = options
		} else if (!callback) {
		  throw Error("A callback must be provided for async operation")
		}
		if (typeof options === 'object') {
		  options = this._getFileOptions(
			{ encoding: "utf8", mode: 0o666, flag: "a" },
			options,
		  )
		} else {
		  options = this._getFileOptions(
			{ encoding: "utf8", mode: 0o666, flag: "a" },
		  )
		}
		if (!options.flag || this._isFileDescriptor(path)) {
		  options.flag = "a"
		}

		this._lowerDir.appendFile(path, data, options, callback)
	}
	
	/**
	 * Synchronously append data to a file, creating the file if it does not exist.
	 * @param path string | number. Path to the file or directory.
	 * @param data string | Buffer. The data to be appended.
	 * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined }. 
	 * Default options are: { encoding: "utf8", mode: 0o666, flag: "w" }.
	 * @returns Promise<void>.
	 */
	appendFileSync(
		path: PathLike, 
		data: Buffer | string, 
		options: FileOptions
	): void {
		if (typeof options === 'object') {
		  options = this._getFileOptions(
			{ encoding: "utf8", mode: 0o666, flag: "a" },
			options,
		  )
		} else {
		  options = this._getFileOptions(
			{ encoding: "utf8", mode: 0o666, flag: "a" },
		  )
		}
		if (!options.flag || this._isFileDescriptor(path)) {
		  options.flag = "a"
		}

		this._lowerDir.appendFileSync(path, data, options)
	}
	
	/**
	 * Asynchronously changes the access permissions of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param mode number. New permissions set.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	chmod(
		path: PathLike,
		mode: number = 0,
		callback: NoParamCallback
	): void {
		this._upperDir.chmod(path, mode, (err: NodeJS.ErrnoException) => {
			if (err !== null) {
				callback(err)
			} else {
				this._lowerDir.chmod(path, mode, callback)
			}
		})
	}
	
	/**
	 * Synchronously changes the access permissions of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param mode number. New permissions set.
	 * @returns void.
	 */
	chmodSync(
		path: PathLike,
		mode: number = 0
	): void {
		this._upperDir.chmodSync(path, mode)
		this._lowerDir.chmodSync(path, mode)
	}
	
	/**
	 * Synchronously changes the owner or group of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	chown(
		path: PathLike,
		uid: number,
		gid: number,
		callback: NoParamCallback
	): void {
		this._upperDir.chown(path, uid, gid, (err: NodeJS.ErrnoException) => {
			if (err) {
				callback(err)
			} else {
				this._lowerDir.chown(path, uid, gid, callback)
			}
		})
	}
	
	/**
	 * Synchronously changes the owner or group of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @returns void.
	 */
	chownSync(
		path: PathLike,
		uid: number,
		gid: number
	): void {
		this._upperDir.chownSync(path, uid, gid)
		this._lowerDir.chownSync(path, uid, gid)
	}
	/**
	 * Synchronously and recursively changes the owner or group of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @param callback (err: NodeJS.ErrnoException) => void.
	 * @returns void.
	 */
	chownr(
		path: PathLike,
		uid: number,
		gid: number,
		callback: NoParamCallback
	): void {
		return this._upperDir.chownr(path, uid, gid, callback)
	}
	
	/**
	 * Synchronously and recursively changes the owner or group of the file system object described by path.
	 * @param path string. Path to the fs object.
	 * @param uid number. User identifier.
	 * @param gid number. Group identifier.
	 * @returns void.
	 */
	chownrSync(
		path: PathLike,
		uid: number,
		gid: number
	): void {
		return this._upperDir.chownrSync(path, uid, gid)
	}

	/**
	 * Asynchronously writes data to the path specified with some FileOptions.
	 * @param path string | number. Path to the file or directory.
	 * @param data string | Buffer. The data to be written.
	 * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined } | 
	 * FileOperationCallback: (err: NodeJS.ErrnoException | null): void.
	 * @param callback FileOperationCallback: (err: NodeJS.ErrnoException | null): void
	 * @returns void.
	 */
	async writeFile(
		path: string | number,
		data: Buffer | string,
		options: (FileOptions | NoParamCallback) = {},
		callback: NoParamCallback,
	): Promise<void> {

		let callbackFinal: (err: Error) => void
		let optionsFinal: ReturnType<EncryptedFS['_getFileOptions']>

		if (!callback && typeof options === 'function') {
			callbackFinal = options
		} else if (callback) {
			callbackFinal = callback
		} else {
			throw Error("A callback must be provided for async operation")
		}

		if (typeof options === 'object') {
			optionsFinal = this._getFileOptions(
				{ encoding: "utf8", mode: 0o666, flag: "a" },
				options,
			)
		} else {
			optionsFinal = this._getFileOptions(
				{ encoding: "utf8", mode: 0o666, flag: "a" },
			)
		}
		const flag = optionsFinal.flag || "w"
		if (this._isFileDescriptor(path)) {
			writeFd(<number>path, true)
			return
		}
		this.open(
			path,
			flag,
			0o666,
			(err: Error, fd: number) => {
				if (err) {
					callbackFinal(err)
				} else {
					writeFd(fd, false)
				}
			},
		)

		const self = this
		function writeFd(fd: number, isUserFd: boolean) {
			const dataBuffer = (typeof data === 'string') ? Buffer.from(data) : data
			const writeBuf = self._isTypedArray(dataBuffer) ? dataBuffer : Buffer.from(dataBuffer.toString(), optionsFinal.encoding || "utf8")
			// TODO: typescript has a cry about this, come back to this later
			// const position = /a/.test(flag) ? null : 0
			let position = 0

			self._writeAll(
				fd,
				isUserFd,
				writeBuf,
				0,
				writeBuf.byteLength,
				position,
				callback,
			)
		}
	}

	/**
	 * Synchronously writes data to the path specified with some FileOptions.
	 * @param path string | number. Path to the file or directory.
	 * @param data string | Buffer. Defines the data to be .
	 * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined }. 
	 * Default options are: { encoding: "utf8", mode: 0o666, flag: "w" }.
	 * @returns void.
	 */
	writeFileSync(
		path: PathLike | number,
		data: string | Buffer,
		options?: FileOptions,
	): void {
		options = this._getFileOptions(
			{ encoding: "utf8", mode: 0o666, flag: "w" },
			options,
		)
		const flag = options.flag || "w"
		const isUserFileDescriptor = this._isFileDescriptor(path)
		let fd: number
		if (isUserFileDescriptor) {
			fd = <number>path
		} else if (typeof path === 'string') {
			fd = this.openSync(path, flag, options.mode)
		} else {
			throw Error('Invalid path or file descriptor')
		}
		let offset = 0
		if (typeof data === 'string') {
			data = Buffer.from(data)
		}
		let length = data.byteLength

		// TODO: typescript has a cry about this, come back to this later
		// let position = /a/.test(flag) ? null : 0
		let position = 0

		try {
			while (length > 0) {
				const written = this.writeSync(fd, data, offset, length, position)
				offset += written
				length -= written
				if (position !== null) {
					position += written
				}
			}
		} finally {
			if (isUserFileDescriptor) {
				this._lowerDir.closeSync(fd)
			}
		}
	}

	/**
	 * Asynchronously opens a file or directory and returns the file descriptor in a callback.
	 * @param path string. Path to the file or directory.
	 * @param flags string. Flags for read/write operations. Defaults to 'r'.
	 * @param mode number. Read and write permissions. Defaults to 0o666.
	 * @param callback (err: NodeJS.ErrnoException | null, fd: number) => void. To be called one operation is complete.
	 * @returns Promise<void>
	 */
	open(
		path: string, 
		flags: string = "r", 
		mode: number = 0o666, 
		callback: (err: NodeJS.ErrnoException | null, fd: number | undefined) => void
	): void {
		let upperFd: number | undefined = undefined
		try {
			const lowerFlags = flags[0] === "w" ? "w+" : "r+"
			const lowerFd = this._lowerDir.openSync(path, lowerFlags, mode)
			const dirPath = Path.dirname(path)
			this._upperDir.mkdirpSync(dirPath)
			this._lowerDir.mkdirSync(dirPath, {recursive: true})
			const upperFilePath = Path.resolve(path)
			if (flags[0] === "r" && !this._upperDir.existsSync(upperFilePath)) {
				this._upperDir.closeSync(this._upperDir.openSync(upperFilePath, "w"))
			}
			upperFd = this._upperDir.openSync(upperFilePath, flags, mode)
			const efsFd = new FileDescriptor(lowerFd, upperFd, flags)
			this._fileDescriptors.set(upperFd, efsFd)
	
			if (flags[0] === "r") {
				this._loadMetadata(upperFd)
			} else if (flags[0] === "w") {
				const hash = this._cryptor.hashSync(this._key)
				this._metadata[upperFd] = { keyHash: hash, size: 0 }
				this._writeMetadataSync(upperFd)
			}
			callback(null, upperFd)
		} catch (err) {
			callback(err, upperFd)
		}
	}

	// TODO: actually implement flags
	// TODO: w+ should truncate, r+ should not
	/**
	 * Synchronously opens a file or directory and returns the file descriptor.
	 * @param path string. Path to the file or directory.
	 * @param flags string. Flags for read/write operations. Defaults to 'r'.
	 * @param mode number. Read and write permissions. Defaults to 0o666.
	 * @returns number (file descriptor in the upperDir).
	 */
	openSync(
		path: PathLike, 
		flags: string = "r", 
		mode: number = 0o666
	): number {
		const pathString: string = (typeof path === 'string') ? path : ((path.constructor === Buffer) ? path.toString() : this._getPathFromURL(path as URL))
		
		const lowerFlags = flags[0] === "w" ? "w+" : "r+"
		let lowerFd: number
		lowerFd = this._lowerDir.openSync(pathString, lowerFlags, mode)
		const dirPath = Path.dirname(pathString)
		this._upperDir.mkdirpSync(dirPath)
		this._lowerDir.mkdirSync(dirPath, {recursive: true})
		const upperFilePath = Path.resolve(pathString)
		if (flags[0] === "r" && !this._upperDir.existsSync(upperFilePath)) {
			this._upperDir.closeSync(this._upperDir.openSync(upperFilePath, "w"))
		}
		const upperFd = this._upperDir.openSync(upperFilePath, flags, mode)
		const efsFd = new FileDescriptor(lowerFd, upperFd, flags)
		this._fileDescriptors.set(upperFd, efsFd)

		if (flags[0] === "r") {
			this._loadMetadata(upperFd)
		} else if (flags[0] === "w") {
			const hash = this._cryptor.hashSync(this._key)
			this._metadata[upperFd] = { keyHash: hash, size: 0 }
			this._writeMetadataSync(upperFd)
		}
		return upperFd
	}

	/**
	 * Get key used for encryption.
	 * @returns Buffer | string (Key)
	 */
	getKey(): Buffer | string {
		return this._key
	}

	_maybeCallback(cb: (err: Error|null, ...args: Array<any>) => void ): (err: Error|null, ...args: Array<any>) => void {
		if (typeof cb === "function") return cb
		throw Error("invalid callback")
	}

	_getFileOptions(defaultOptions: FileOptions, options?: FileOptions): FileOptions {
		let optionsFinal: FileOptions = defaultOptions
		if (typeof options === "string") {
			if (!this._isCharacterEncoding(options)) {
				throw Error('Invalid encoding string')
			}
			return { ...defaultOptions, encoding: options }
		}
		if (options) {
			if (options.encoding) {
				if (this._isCharacterEncoding(options.encoding)) {
					optionsFinal = { ...optionsFinal, encoding: options.encoding }
				} else {
					throw Error('Invalid encoding string')
				}
			}
			if (options.flag) {
				optionsFinal = { ...optionsFinal, flag: options.flag}
			}
			if (options.mode) {
				optionsFinal = { ...optionsFinal, mode: options.mode}
			}
		}
		return optionsFinal
	}

	_getStreamOptions(defaultOptions: optionsStream, options?: optionsStream): optionsStream {
		let optionsFinal: optionsStream = defaultOptions
		if (typeof options === "string") {
			if (!this._isCharacterEncoding(options)) {
				throw Error('Invalid encoding string')
			}
			return { ...defaultOptions, encoding: options }
		}
		if (options) {
			if (options.highWaterMark) {
				optionsFinal = { ...optionsFinal, highWaterMark: options.highWaterMark}
			}
			if (options.flags) {
				optionsFinal = { ...optionsFinal, flags: options.flags}
			}
			if (options.encoding) {
				if (this._isCharacterEncoding(options.encoding)) {
					optionsFinal = { ...optionsFinal, encoding: options.encoding }
				} else {
					throw Error('Invalid encoding string')
				}
			}
			if (options.fd) {
				optionsFinal = { ...optionsFinal, fd: options.fd}
			}
			if (options.mode) {
				optionsFinal = { ...optionsFinal, mode: options.mode}
			}
			if (options.autoClose) {
				optionsFinal = { ...optionsFinal, autoClose: options.autoClose}
			}
			if (options.start) {
				optionsFinal = { ...optionsFinal, start: options.start}
			}
			if (options.end) {
				optionsFinal = { ...optionsFinal, end: options.end}
			}
		}
		return optionsFinal
	}

	_isCharacterEncoding(encoding: string|null|undefined): encoding is CharacterEncoding {
		if (encoding == null || encoding == undefined) {
			return true
		}
		return ['ascii' , 'utf8' , 'utf-8' , 'utf16le' , 'ucs2' , 'ucs-2' , 'base64' , 'latin1' , 'binary' , 'hex'].includes(encoding)
	}

	_isTypedArray(array: any) {
		return ArrayBuffer.isView(array) && !(array instanceof DataView)
	}

	_writeAll(
		fd: number,
		isUserFd: boolean,
		buffer: string | any[] | Buffer,
		offset: number,
		length: number,
		position: number,
		callback: Function,
	) {
		if (typeof buffer === 'string') {
			buffer = Buffer.from(buffer)
		}
		this.write(
			fd,
			<Buffer>buffer,
			offset,
			length,
			position,
			(writeErr: Error, written: number) => {
				if (writeErr) {
					if (isUserFd) {
					callback(writeErr)
					} else {
						this.close(
							fd,
							() => {
							callback(writeErr)
							},
						)
					}
				} else if (written === length) {
					if (isUserFd) {
					callback(null)
					} else {
					this.close(fd, callback)
					}
				} else {
					offset += written
					length -= written
					if (position !== null) {
					position += written
					}
					this._writeAll(
					fd,
					isUserFd,
					buffer,
					offset,
					length,
					position,
					callback,
					)
				}
			},
		)
	}


	// ========= HELPER FUNCTIONS =============
	// TODO: does there need to be a an async version of this for async api methods?
	/**
	 * Reads the whole block that the position lies within.
	 * @param fd File descriptor.
	 * @param position Position of data required.
	 * @returns Buffer.
	 */
	_readBlock(fd: number, position: number): Buffer {
		// Returns zero buffer if file has no content
		if (this._positionOutOfBounds(fd, position)) {
			return Buffer.alloc(this._blockSize)
		}

		const blockNum = this._offsetToBlockNum(position)
		const blockOffset = this._blockNumToOffset(blockNum)
		// TODO: optimisation: if we can ensure that readSync will always write blockSize, then we can use allocUnsafe
		const blockBuf = Buffer.alloc(this._blockSize)

		this.readSync(fd, blockBuf, 0, this._blockSize, blockOffset)

		return blockBuf
	}

	// // TODO: is this really needed? we could just define a method in the interface that EFS expects for upperDir...
	// /**
	//  * Recursively create intermediate directories.
	//  * @param targetDir Path describing the target directory.
	//  * @param isRelativeToScript TODO: what does this do?.
	//  * @returns void.
	//  */
	// _mkdirRecursiveSync(targetDir: string, isRelativeToScript: boolean = false): void {
	// 	const separator = Path.sep
	// 	const initDir = Path.isAbsolute(targetDir) ? separator : ""

	// 	const baseDir = isRelativeToScript ? __dirname : "."

	// 	let targetDirs: string[]
	// 	if (initDir === "") {
	// 		targetDirs = Path.resolve(Path.join(baseDir, targetDir)).split(separator)
	// 	} else {
	// 		targetDirs = targetDir.split(separator)
	// 	}
	// 	targetDirs.reduce(
	// 		(parentDir, childDir) => {
	// 		let newDir = Path.join(parentDir, childDir)
	// 		try {
	// 			this._upperDir.mkdirSync(newDir)
	// 		} catch (err) {
	// 			if (err.code === "EEXIST") {
	// 				return newDir
	// 			}

	// 			if (err.code === "ENOENT") {
	// 				throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`)
	// 			}
	// 		}
	// 		return newDir
	// 		},
	// 		separator,
	// 	)
	// }

	// #TODO: optimise to skip read if newData is block size, otherwise always need a read
	// TODO: what happens if file is less than block size?
	/**
	 * Reads from disk the chunk containing the block that needs to be merged with new block
	 * @param fd File descriptor.
	 * @param newData Buffer containing the new data.
	 * @param position Position of the insertion.
	 * @returns Buffer (a plaintext buffer containing the merge blocks in a single block).
	 */
	_overlaySegment(fd: number, newData: Buffer, position: number) {
		// 	case 1:  segment is aligned to start of block
		// 	case 2:  segment is aligned to start-of-block but end before end-of-block
		// 	case 3:  segment is not aligned to start and ends before end-of-block
		// 	case 4:  segment is not aligned to start-of-block and ends at end-of-block
		//
		// 	Cases 3 and 4 are not possible when overlaying the last segment
		//
		// TODO: throw err if buff length  > block size


		const writeOffset = position & (this._blockSize-1) // byte offset from where to start writing new data in the block

		// read entire block, position belongs to
		const origBlock = this._readBlock(fd, position)

		let startSlice = Buffer.alloc(0)
		// Populate array if newData is not block aligned
		const isBlockAligned = ((position & this._blockSize-1) === 0)
		if (!isBlockAligned) {
			startSlice = origBlock.slice(0, writeOffset)
		}

		// Any data reamining after new block
		const endSlice = origBlock.slice(writeOffset + newData.length)

		// patch up slices to create new block
		// TODO: specify length -- maybe also assert the 3 segments do infact amount to only blocksize
		const newBlock = Buffer.concat([startSlice, newData, endSlice])


		// TODO: assert that newBlock is === blockSize

		return newBlock
	}

	/**
	 * Checks if path is a file descriptor (number) or not (string).
	 * @param path Path of file.
	 * @returns boolean
	 */
	_isFileDescriptor(path: PathLike | number): path is number {
		if (typeof path === 'number') {
			if (this._fileDescriptors.has(path)) {
				return true
			}
		}

		return false
	}

	/**
	 * Takes the position in to a file and returns the block number that 'position' lies in.
	 * @param fd File descriptor.
	 * @returns number
	 */
	_getLowerFd(fd: number): number {
		if (this._fileDescriptors.has(fd)) {
			const efsFd = this._fileDescriptors.get(fd)
			if (efsFd) {
				const lowerFd = efsFd.getLowerFd()
				if (lowerFd) {
					return lowerFd
				} else {
					throw Error("efs file descriptor is undefined")
				}
			} else {
				throw Error("efs file descriptor is undefined")
			}
		} else {
			throw Error("efs file descriptor does not exist")
		}
	}

	/**
	 * Takes a position in a file and returns the block number that 'position' lies in.
	 * @param position
	 * @returns number (Block number)
	 */
	_offsetToBlockNum(position: number): number {
		// we use blockSize as opposed to chunkSize because chunk contains metadata
		// transparent to user. When user specifies position it is as if it were plaintext
		return Math.floor(position/this._blockSize)
	}

	/**
	 * Calculates the offset/position of the block number in the unencrypted file.
	 * @param blockNum Block number.
	 * @returns number (position offset)
	 */
	_blockNumToOffset(blockNum: number): number {
		return (blockNum * this._blockSize)
	}

	/**
	 * Calculates the offset/position of the chunk number in the unencrypted file.
	 * @param chunkNum Chunk number.
	 * @returns number (position offset)
	 */
	_chunkNumToOffset(chunkNum: number): number {
		return (chunkNum * this._chunkSize)
	}

	/**
	 * Calculates the offset/position of the chunk number in the unencrypted file.
	 * @param chunkNum Chunk number.
	 * @returns number (position offset)
	 */
	_offsetToChunkNum(position: number) {
			return Math.floor(position/this._chunkSize)
	}

	/**
	 * Creates a block generator for block iteration, split is per block length.
	 * @param blocks Buffer containing blocks to be split.
	 * @param blockSize Size of an individual block.
	 * @returns IterableIterator<Buffer> (the iterator for the blocks split into buffer.length/blockSize blocks)
	 */
	*_blockGenerator(blocks: Buffer, blockSize: number = this._blockSize): IterableIterator<Buffer> {
		let iterCount = 0
		let currOffset = 0
		while (currOffset < blocks.length) {
			yield blocks.slice(currOffset, currOffset + blockSize)
			currOffset += blockSize
			iterCount++
		}
	}

	/**
	 * Creates a chunk generator for chunk iteration, split is per block length.
	 * @param chunks Buffer containing blocks to be split.
	 * @param chunkSize Size of an individual block.
	 * @returns IterableIterator<Buffer> (the iterator for the chunks split into buffer.length/chunkSize blocks)
	 */
	*_chunkGenerator(chunks: Buffer, chunkSize: number = this._chunkSize): IterableIterator<Buffer> {
		let iterCount = 0
		let currOffset = 0
		while (currOffset < chunks.length) {
			yield chunks.slice(currOffset, currOffset + chunkSize)
			currOffset += chunkSize
			iterCount++
		}
	}

	/**
	 * Checks if the position is out of bounds for a given file (fd).
	 * @param fd File descriptor.
	 * @param position Position in question.
	 * @returns boolean (true if position is out of bounds, false if position is within bounds)
	 */
	_positionOutOfBounds(fd: number, position: number): boolean {
		// TODO: confirm that '>=' is correct here
		const _isPositionOutOfBounds = (position >= this._lowerDir.fstatSync(fd).size)
		return _isPositionOutOfBounds
	}

	/**
	 * Synchronously checks if file (fd) contains conntent or not.
	 * @param fd File descriptor.
	 * @returns boolean (true if file has content, false if file has no content)
	 */
	_hasContentSync(fd: number): boolean {
		const _hasContent = (this._lowerDir.fstatSync(fd).size !== 0)
		return _hasContent
	}

	/**
	 * Synchronously checks for file size.
	 * @param fd File descriptor.
	 * @returns boolean (true if file has content, false if file has no content)
	 */
	_getPostWriteFileSize(fd: number, position: number, length: number): number {
		const fileMeta = this._metadata[fd]
		const newSize = position + length
		const fileSize = fileMeta.size
		if (newSize > fileSize) {
			fileMeta.size = newSize
			return newSize
		} else {
			return fileSize
		}
	}
	
	_writeMetadataSync(fd: number): void {
		const iv = this._cryptor.getRandomInitVectorSync()
		const metadata = this._getMetadata(fd)
		const serialMeta = JSON.stringify(metadata)
		const metadataBlk = Buffer.concat(
			[Buffer.from(serialMeta)],
			this._blockSize,
		)
		const ctMetadata = this._cryptor.encryptSync(metadataBlk, iv)
		const metaChunk = Buffer.concat([iv, ctMetadata], this._chunkSize)
		const metadataOffset = this._getMetadataOffsetSync(fd)
		this._lowerDir.writeSync(
			this._getLowerFd(fd),
			metaChunk,
			0,
			metaChunk.length,
			metadataOffset,
		)
	}

	_loadMetadata(fd: number): void {
		const metaChunk = Buffer.allocUnsafe(this._chunkSize)
		const metaChunkOffset = this._getMetadataOffsetSync(fd)
		this._lowerDir.readSync(
			this._getLowerFd(fd),
			metaChunk,
			0,
			metaChunk.length,
			metaChunkOffset,
		)
		const iv = metaChunk.slice(0, this._initVectorSize)

		const metaCt = metaChunk.slice(this._initVectorSize)
		const metaPlain = this._cryptor.decryptSync(metaCt, iv)
		const metaPlainTrimmed = metaPlain.slice(0, (metaPlain.indexOf('\0')))

		const fileMeta = eval("(" + metaPlainTrimmed.toString() + ")")
		this._metadata[fd] = fileMeta
	}

	_getMetadata(fd: number): Metadata {
		if (_.has(this._metadata, fd)) {
		const fileMeta = this._metadata[fd]
			if (fileMeta) {
				return fileMeta
			}
		}
		throw Error("file descriptor has no metadata stored")
	}
	_getMetaField(fd: number, fieldName: 'size' | 'keyHash'): number | Buffer {
		const fileMeta: Metadata = this._getMetadata(fd)
		if (_.has(fileMeta, fieldName)) {
			const fieldVal = fileMeta[fieldName]
			if (fieldVal != null) {
				return fieldVal
			}
		} 
		throw Error("Field does not exist")
	}
	_getMetadataOffsetSync(fd: number): number {
		const efsFd = this._getEfsFd(fd)
		const stats = this._lowerDir.fstatSync(this._getLowerFd(fd))
		const size = stats.size
		if (efsFd.getFlags()[0] === "w") {
			return size
		}

		const numBlocks = size / this._chunkSize
		return this._chunkNumToOffset(numBlocks - 1)
	}
	_getEfsFd(fd: number): FileDescriptor {
		if (this._fileDescriptors.has(fd)) {
			const efsFd = this._fileDescriptors.get(fd)
			if (efsFd) {
				return efsFd
			}
		}

		throw Error("file descriptor has no metadata stored")
	}


	/**
	 * Processes path types and collapses it to a string.
	 * The path types can be string or Buffer or URL.
	 * @private
	 */
	_getPath (path: PathLike): string {
		if (typeof path === 'string') {
			return path
		}
		if (path instanceof Buffer) {
			return path.toString()
		}
		if (typeof path === 'object' && typeof path.pathname === 'string') {
			return this._getPathFromURL(path)
		}
		throw new TypeError('path must be a string or Buffer or URL')
	}

	/**
	 * Acquires the file path from an URL object.
	 * @private
	 */
	_getPathFromURL (url: {pathname: string} | URL): string {
	  if (_.has(url, 'hostname')) {
		throw new TypeError('ERR_INVALID_FILE_URL_HOST')
	  }
	  const pathname = url.pathname
	  if (pathname.match(/%2[fF]/)) {
		// must not allow encoded slashes
		throw new TypeError('ERR_INVALID_FILE_URL_PATH')
	  }
	  return decodeURIComponent(pathname)
	}
}





/*
 * Primitive Documentation:
 *
 * Chunks:
 * 	Chunks consist of a an acutal data 'block' with the IV preceding it
 *
 * Block:
 * 	This is a constant sized amount (optionally user-specified) of business data.
 * 	A large file is split into several block of *block_size* (generall 4k).
 * 	This is to to allow random access reads and writies.
 * 	For example to read a small section of a file, the entire file does not need to be decrpted
 * 	Only the block(s) that contain the section you want to read.
 * 	This does mean however, that there needs to be an IV for each block.
 * 	This is because reusing IVs, or having predictable IVs is a security threat.
 * 	It can lead to the _______ attack. TODO: which attack again?
 *
 * 	Perhaps for large executables, where you need to always read the file in its entirely,
 * 	We can get rid of the block and IVs. But consider if it's really worth it because you're
 * 	only saving kilobytes here.
 *
 * Segment:
 * 	Some amount of data equal or smaller than a block
 */