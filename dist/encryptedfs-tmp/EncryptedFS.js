"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Cryptor_1 = __importDefault(require("./Cryptor"));
const FileDescriptor_1 = __importDefault(require("./FileDescriptor"));
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const constants_1 = require("./constants");
const Streams_1 = require("./Streams");
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
class EncryptedFS {
    constructor(key, upperDir, upperDirContextControl, lowerDir, lowerDirContextControl, umask = 0o022, initVectorSize = 16, blockSize = 4096, useWebWorkers = false) {
        this._keySize = 32;
        this._umask = umask;
        this._key = key;
        this._cryptor = new Cryptor_1.default(key, undefined, undefined, useWebWorkers);
        this._upperDir = upperDir;
        this._upperDirContextControl = upperDirContextControl;
        this._lowerDir = lowerDir;
        this._lowerDirContextControl = lowerDirContextControl;
        this._initVectorSize = initVectorSize;
        this._blockSize = blockSize;
        this._chunkSize = this._blockSize + this._initVectorSize;
        this._fileDescriptors = new Map();
        this._headerSize = this._blockSize;
        this._metadata = {};
        this._useWebWorkers = useWebWorkers;
        this.constants = constants_1.constants;
    }
    /**
     * Synchronously tests a user's permissions for the file specified by path.
     * @param fd number. File descriptor.
     * @returns void.
     */
    accessSync(path, mode = 0o666) {
        this._upperDir.accessSync(path, mode);
        this._lowerDir.accessSync(path, mode);
    }
    getUmask() {
        return this._umask;
    }
    setUmask(umask) {
        this._upperDirContextControl.setUmask(umask);
        this._umask = umask;
    }
    getUid() {
        return this._uid;
    }
    setUid(uid) {
        this._upperDirContextControl.setUid(uid);
        this._uid = uid;
    }
    getGid() {
        return this._gid;
    }
    setGid(gid) {
        this._upperDirContextControl.setGid(gid);
        this._gid = gid;
    }
    getCwd() {
        return this._upperDir.getCwd();
    }
    // TODO: nodejs fs (i.e. _lowerDir) does not have a native method for changing directory and depends on process.chdir(...)
    // which seems a little too much like a global change. We could also just keep track of the cwd in upperDir (vfs) and then
    // every time there is an operation using _lowerDir, we just prepend this cwd to the path.
    chdir(path) {
        this._upperDirContextControl.chdir(path);
    }
    /**
     * Asynchronously tests a user's permissions for the file specified by path with a callback.
     * @param fd number. File descriptor.
     * @param callback NoParamCallback.
     * @returns Promise<void>.
     */
    async access(path, mode = 0, callback) {
        this._upperDir.access(path, mode, (err) => {
            callback(err);
        });
    }
    /**
     * Asynchronously retrieves the path stats in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    lstat(path, callback) {
        return this._upperDir.lstat(path, callback);
    }
    /**
     * Synchronously retrieves the path stats in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    lstatSync(path) {
        return this._upperDir.lstatSync(path);
    }
    /**
     * Asynchronously makes the directory in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param mode number | undefined. Permissions or mode.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    mkdir(path, options = { mode: 0o777, recursive: false }, callback) {
        this._lowerDir.mkdir(path, options, (err) => {
            if (options.recursive) {
                this._upperDir.mkdirp(path, options.mode, (err) => {
                    callback(err);
                });
            }
            else {
                this._upperDir.mkdir(path, options.mode, (err) => {
                    callback(err);
                });
            }
        });
    }
    /**
     * Synchronously makes the directory in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param mode number | undefined. Permissions or mode.
     * @returns void.
     */
    mkdirSync(path, options = { mode: 0o777, recursive: false }) {
        this._lowerDir.mkdirSync(path, options);
        if (options.recursive) {
            this._upperDir.mkdirpSync(path, options.mode);
        }
        else {
            this._upperDir.mkdirSync(path, options.mode);
        }
    }
    /**
     * Synchronously makes a temporary directory with the prefix given.
     * @param prefix string. Prefix of temporary directory.
     * @param options { encoding: CharacterEncoding } | CharacterEncoding | null | undefined
     * @param callback (err: NodeJS.Errno.Exception) => void.
     * @returns void.
     */
    mkdtemp(prefix, options = 'utf8', callback) {
        return this._upperDir.mkdtemp(prefix, options, (err, path) => {
            if (err) {
                callback(err, path.toString());
            }
            else {
                this._lowerDir.mkdtemp(prefix, options, (err, path) => {
                    callback(err, path.toString());
                });
            }
        });
    }
    /**
     * Synchronously makes a temporary directory with the prefix given.
     * @param prefix string. Prefix of temporary directory.
     * @param options { encoding: CharacterEncoding } | CharacterEncoding | null | undefined
     * @returns void.
     */
    mkdtempSync(prefix, options = 'utf8') {
        const lowerPath = this._lowerDir.mkdtempSync(prefix, options);
        const lowerStat = this._lowerDir.statSync(lowerPath);
        this._upperDir.mkdirpSync(lowerPath, lowerStat.mode);
        return lowerPath;
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
    stat(path, callback) {
        return this._upperDir.stat(path, callback);
    }
    /**
     * Asynchronously retrieves  in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    statSync(path) {
        return this._upperDir.statSync(path);
    }
    /**
     * Asynchronously removes the directory in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param options: { recursive: boolean }.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    rmdir(path, options = undefined, callback) {
        // TODO: rmdir on VFS doesn't have an option to recusively delete
        if (options === null || options === void 0 ? void 0 : options.recursive) {
            this._lowerDir.rmdir(path, options, callback);
        }
        else {
            return this._upperDir.rmdir(path, (err) => {
                if (err) {
                    callback(err);
                }
                else {
                    this._lowerDir.rmdir(path, options, callback);
                }
            });
        }
    }
    /**
     * Synchronously removes the directory in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param options: { recursive: boolean }.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    rmdirSync(path, options = undefined) {
        // TODO: rmdirSync on VFS doesn't have an option to recusively delete
        if (!(options === null || options === void 0 ? void 0 : options.recursive)) {
            this._upperDir.rmdirSync(path);
        }
        this._lowerDir.rmdirSync(path, options);
    }
    /**
     * Asynchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
     * @param dstPath string. Destination path.
     * @param srcPath string. Source path.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    symlink(dstPath, srcPath, type, callback) {
        return this._upperDir.symlink(dstPath, srcPath, type, (err) => {
            this._lowerDir.symlink(dstPath, srcPath, type, (err) => {
                callback(err);
            });
        });
    }
    /**
     * Synchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
     * @param dstPath string. Destination path.
     * @param srcPath string. Source path.
     * @returns void.
     */
    symlinkSync(dstPath, srcPath, type = 'file') {
        this._upperDir.symlinkSync(dstPath, srcPath, type);
        this._lowerDir.symlinkSync(dstPath, srcPath, type);
    }
    /**
     * Synchronously creates a symbolic link between the given paths in the upper file system directory. Propagates upper fs method.
     * @param dstPath string. Destination path.
     * @param srcPath string. Source path.
     * @returns void.
     */
    truncateSync(file, len = 0) {
        return this._upperDir.truncateSync(file, len);
    }
    /**
     * Asynchronously unlinks the given path in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    unlink(path, callback) {
        return this._upperDir.unlink(path, callback);
    }
    /**
     * Synchronously unlinks the given path in the upper file system directory. Propagates upper fs method.
     * @param path string. Path to create.
     * @param callback (err: NodeJS.ErrnoException | null) => void.
     * @returns void.
     */
    unlinkSync(path) {
        return this._upperDir.unlinkSync(path);
    }
    /**
     * Asynchronously changes the access and modification times of the file referenced by path.
     * @param path string. Path to file.
     * @param atime number | string | Date. Access time.
     * @param mtime number | string | Date. Modification time.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    utimes(path, atime, mtime, callback) {
        return this._upperDir.utimes(path, atime, mtime, callback);
    }
    /**
     * Synchronously changes the access and modification times of the file referenced by path.
     * @param path string. Path to file.
     * @param atime number | string | Date. Access time.
     * @param mtime number | string | Date. Modification time.
     * @returns void.
     */
    utimesSync(path, atime, mtime) {
        this._upperDir.utimesSync(path, atime, mtime);
        this._lowerDir.utimesSync(path, atime, mtime);
    }
    /**
     * Asynchronously closes the file descriptor with a callback.
     * @param fd number. File descriptor.
     * @returns Promise<void>.
     */
    close(fd, callback) {
        const lowerFd = this._getLowerFd(fd);
        this._lowerDir.close(lowerFd, err => {
            if (err) {
                console.log(`error: ${err}`);
            }
            this._upperDir.close(fd, (err) => {
                this._fileDescriptors.delete(fd);
                callback(null);
            });
        });
    }
    /**
     * Synchronously closes the file descriptor.
     * @param fd number. File descriptor.
     * @returns void.
     */
    closeSync(fd) {
        const lowerFd = this._getLowerFd(fd);
        this._lowerDir.closeSync(lowerFd);
        this._upperDir.closeSync(fd);
        this._fileDescriptors.delete(fd);
    }
    /**
     * Synchronously writes buffer (with length) to the file descriptor at an offset and position.
     * @param path string. Path to directory to be read.
     * @param options FileOptions.
     * @returns string[] (directory contents).
     */
    readdir(path, options = undefined, callback) {
        return this._upperDir.readdir(path, options = options, callback = callback);
    }
    /**
     * Synchronously writes buffer (with length) to the file descriptor at an offset and position.
     * @param path string. Path to directory to be read.
     * @param options FileOptions.
     * @returns string[] (directory contents).
     */
    readdirSync(path, options = undefined) {
        return this._upperDir.readdirSync(path, options);
    }
    /**
     * Creates a read stream from the given path and options.
     * @param path string.
     * @param callback: (exists: boolean) => void
     * @returns boolean.
     */
    createReadStream(path, options) {
        path = this._getPath(path);
        options = this._getStreamOptions({
            flags: 'r',
            encoding: undefined,
            fd: null,
            mode: constants_1.DEFAULT_FILE_PERM,
            autoClose: true,
            end: Infinity
        }, options);
        if (options.start !== undefined) {
            if (options.start > options.end) {
                throw new RangeError('ERR_VALUE_OUT_OF_RANGE');
            }
        }
        return new Streams_1.ReadStream(path, options, this);
    }
    /**
     * Creates a write stream from the given path and options.
     * @param path string.
     * @param callback: (exists: boolean) => void
     * @returns boolean.
     */
    createWriteStream(path, options) {
        path = this._getPath(path);
        options = this._getStreamOptions({
            flags: 'w',
            encoding: 'utf8',
            fd: null,
            mode: constants_1.DEFAULT_FILE_PERM,
            autoClose: true
        }, options);
        if (options.start !== undefined) {
            if (options.start < 0) {
                throw new RangeError('ERR_VALUE_OUT_OF_RANGE');
            }
        }
        return new Streams_1.WriteStream(path, options, this);
    }
    /**
     * Synchronously checks if path exists.
     * @param path string.
     * @param callback: (exists: boolean) => void
     * @returns boolean.
     */
    exists(path, callback) {
        return this._upperDir.exists(path, callback = callback);
    }
    /**
     * Synchronously checks if path exists.
     * @param path string.
     * @returns boolean.
     */
    existsSync(path) {
        return this._upperDir.existsSync(path);
    }
    /**
     * Asynchronously manipulates the allocated disk space for a file.
     * @param fdIndex number. File descriptor index.
     * @param offset number. Offset to start manipulations from.
     * @param len number. New length for the file.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    fallocate(fdIndex, offset, len, callback) {
        return this._upperDir.fallocate(fdIndex, offset, len, callback);
    }
    /**
     * Synchronously manipulates the allocated disk space for a file.
     * @param fdIndex number. File descriptor index.
     * @param offset number. Offset to start manipulations from.
     * @param len number. New length for the file.
     * @returns void.
     */
    fallocateSync(fdIndex, offset, len) {
        return this._upperDir.fallocateSync(fdIndex, offset, len);
    }
    /**
     * Asynchronously changes the permissions of the file referred to by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @param mode number. New permissions set.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    fchmod(fdIndex, mode = 0, callback) {
        return this._upperDir.fchmod(fdIndex, mode, callback);
    }
    /**
     * Synchronously changes the permissions of the file referred to by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @param mode number. New permissions set.
     * @returns void.
     */
    fchmodSync(fdIndex, mode = 0) {
        return this._upperDir.fchmodSync(fdIndex, mode);
    }
    /**
     * Asynchronously changes the owner or group of the file referred to by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    fchown(fdIndex, uid, gid, callback) {
        return this._upperDir.fchown(fdIndex, uid, gid, callback);
    }
    /**
     * Synchronously changes the owner or group of the file referred to by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @returns void.
     */
    fchownSync(fdIndex, uid, gid) {
        return this._upperDir.fchownSync(fdIndex, uid, gid);
    }
    /**
     * Asynchronously flushes in memory data to disk. Not required to update metadata.
     * @param fdIndex number. File descriptor index.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    fdatasync(fdIndex, callback) {
        return this._upperDir.fdatasync(fdIndex, callback);
    }
    /**
     * Synchronously flushes in memory data to disk. Not required to update metadata.
     * @param fdIndex number. File descriptor index.
     * @returns void.
     */
    fdatasyncSync(fdIndex) {
        return this._upperDir.fdatasyncSync(fdIndex);
    }
    /**
     * Asynchronously retrieves data about the file described by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @param callback (err: NodeJS.ErrnoException, stat: Stat) => void.
     * @returns void.
     */
    fstat(fdIndex, callback) {
        return this._upperDir.fstat(fdIndex, callback);
    }
    /**
     * Synchronously retrieves data about the file described by fdIndex.
     * @param fdIndex number. File descriptor index.
     * @returns void.
     */
    fstatSync(fdIndex) {
        return this._upperDir.fstatSync(fdIndex);
    }
    /**
     * Synchronously flushes all modified data to disk.
     * @param fdIndex number. File descriptor index.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    fsync(fdIndex, callback) {
        return this._upperDir.fsync(fdIndex, callback);
    }
    /**
     * Synchronously flushes all modified data to disk.
     * @param fdIndex number. File descriptor index.
     * @returns void.
     */
    fsyncSync(fdIndex) {
        return this._upperDir.fsyncSync(fdIndex);
    }
    /**
     * Asynchronously truncates to given length.
     * @param fdIndex number. File descriptor index
     * @param len number. Length to truncate to.
     * @returns void.
     */
    ftruncate(fdIndex, len = 0, callback) {
        return this._upperDir.ftruncate(fdIndex, len = len, callback = callback);
    }
    /**
     * Synchronously truncates to given length.
     * @param fdIndex number. File descriptor index
     * @param len number. Length to truncate to.
     * @returns void.
     */
    ftruncateSync(fdIndex, len = 0) {
        return this._upperDir.ftruncateSync(fdIndex, len);
    }
    /**
     * Asynchronously changes the access and modification times of the file referenced by fdIndex.
     * @param fdIndex number. File descriptor index
     * @param atime number | string | Date. Access time.
     * @param mtime number | string | Date. Modification time.
     * @returns void.
     */
    futimes(fdIndex, atime, mtime, callback) {
        return this._upperDir.futimes(fdIndex, atime, mtime, callback);
    }
    /**
     * Synchronously changes the access and modification times of the file referenced by fdIndex.
     * @param fdIndex number. File descriptor index
     * @param atime number | string | Date. Access time.
     * @param mtime number | string | Date. Modification time.
     * @returns void.
     */
    futimesSync(fdIndex, atime, mtime) {
        return this._upperDir.futimesSync(fdIndex, atime, mtime);
    }
    /**
     * Synchronously links a path to a new path.
     * @param existingPath string.
     * @param newPath string.
     * @param callback: (err: NodeJS.ErrnoException | null) => void
     * @returns void.
     */
    link(existingPath, newPath, callback) {
        return this._lowerDir.link(existingPath, newPath, (err) => {
            this._upperDir.link(existingPath, newPath, (err) => {
                callback(err);
            });
        });
    }
    /**
     * Synchronously links a path to a new path.
     * @param existingPath string.
     * @param newPath string.
     * @returns void.
     */
    linkSync(existingPath, newPath) {
        this._lowerDir.linkSync(existingPath, newPath);
        this._upperDir.linkSync(existingPath, newPath);
    }
    /**
     * Asynchronously seeks a link to the fd index provided.
     * @param fdIndex number.
     * @param position number.
     * @param seekFlags number.
     * @param callback: (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    lseek(fdIndex, position, seekFlags = constants_1.constants.SEEK_SET, callback) {
        return this._upperDir.lseek(fdIndex, position, seekFlags = seekFlags, callback = callback);
    }
    /**
     * Synchronously seeks a link to the fd index provided.
     * @param fdIndex number.
     * @param position number.
     * @param seekFlags number.
     * @returns void.
     */
    lseekSync(fdIndex, position, seekFlags = constants_1.constants.SEEK_SET) {
        return this._upperDir.lseekSync(fdIndex, position, seekFlags);
    }
    /**
     * Synchronously reads data from a file given the path of that file.
     * @param path string. Path to file.
     * @returns void.
     */
    readFile(path, options = undefined, callback) {
        let fd = undefined;
        let data = undefined;
        try {
            fd = this.openSync(path, "r");
            const size = this._getMetadata(fd).size;
            const readBuffer = Buffer.allocUnsafe(size);
            this.readSync(fd, readBuffer, 0, size, 0);
            data = (options && options.encoding) ? readBuffer.toString(options.encoding) : readBuffer;
            callback(null, data);
        }
        catch (err) {
            callback(err, data);
        }
        finally {
            if (fd !== undefined)
                this.closeSync(fd);
        }
    }
    /**
     * Synchronously reads data from a file given the path of that file.
     * @param path string. Path to file.
     * @returns Buffer (read buffer).
     */
    readFileSync(path, options) {
        let fd = undefined;
        try {
            fd = this.openSync(path, "r");
            const size = this._getMetadata(fd).size;
            const readBuffer = Buffer.allocUnsafe(size);
            this.readSync(fd, readBuffer, 0, size, 0);
            return (options && options.encoding) ? readBuffer.toString(options.encoding) : readBuffer;
        }
        finally {
            if (fd !== undefined)
                this.closeSync(fd);
        }
    }
    /**
     * Synchronously reads link of the given the path. Propagated from upper fs.
     * @param path string. Path to file.
     * @param options FileOptions | undefined.
     * @param callback (err: NodeJS.ErrnoException, data: Buffer | string) => void.
     * @returns void.
     */
    readlink(path, options = undefined, callback) {
        return this._upperDir.readlink(path, options = options, callback = callback);
    }
    /**
     * Synchronously reads link of the given the path. Propagated from upper fs.
     * @param path string. Path to file.
     * @param options FileOptions | undefined.
     * @returns string | Buffer.
     */
    readlinkSync(path, options = undefined) {
        return this._upperDir.readlinkSync(path, options);
    }
    /**
     * Synchronously reads link of the given the path. Propagated from upper fs.
     * @param path string. Path to file.
     * @param options FileOptions | undefined.
     * @param callback: (err: NodeJS.ErrnoException, path: string | Buffer) => void
     * @returns void.
     */
    realpath(path, options = undefined, callback) {
        return this._upperDir.realpath(path, options = options, callback = callback);
    }
    /**
     * Synchronously reads link of the given the path. Propagated from upper fs.
     * @param path string. Path to file.
     * @param options FileOptions | undefined.
     * @returns Buffer (read buffer).
     */
    realpathSync(path, options = undefined) {
        return this._upperDir.realpathSync(path, options);
    }
    /**
     * Asynchronously renames the file system object described by oldPath to the given new path. Propagated from upper fs.
     * @param oldPath string. Old path.
     * @param oldPath string. New path.
     * @param callback: (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    rename(oldPath, newPath, callback) {
        return this._upperDir.rename(oldPath, newPath, callback);
    }
    /**
     * Synchronously renames the file system object described by oldPath to the given new path. Propagated from upper fs.
     * @param oldPath string. Old path.
     * @param oldPath string. New path.
     * @returns void.
     */
    renameSync(oldPath, newPath) {
        return this._upperDir.renameSync(oldPath, newPath);
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
    read(fd, buffer, offset = 0, length = 0, position = 0, callback) {
        const numChunksToRead = Math.ceil(length / this._blockSize);
        const startChunkNum = this._offsetToBlockNum(position);
        const plaintextBlocks = [];
        const chunkBuf = Buffer.allocUnsafe(numChunksToRead * this._chunkSize);
        const lowerFd = this._getLowerFd(fd);
        this._lowerDir.read(lowerFd, chunkBuf, 0, numChunksToRead * this._chunkSize, this._chunkNumToOffset(startChunkNum), (err, bytesWritten, buffer) => {
            const chunkIter = this._chunkGenerator(buffer);
            let chunk;
            for (chunk of chunkIter) {
                const iv = chunk.slice(0, this._initVectorSize);
                const chunkData = chunk.slice(this._initVectorSize);
                const plaintextBlock = this._cryptor.decryptSync(chunkData, iv);
                plaintextBlocks.push(plaintextBlock);
            }
            const decryptedReadBuffer = Buffer.concat(plaintextBlocks, numChunksToRead * this._blockSize);
            const startBlockOffset = position & this._blockSize - 1;
            decryptedReadBuffer.copy(buffer, offset, startBlockOffset, length);
            callback(null, buffer.length, buffer);
        });
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
    readSync(fd, buffer, offset = 0, length = 0, position = 0) {
        // TODO: actually use offset, length and position
        // length is specified for plaintext file, but we will be reading from encrypted file
        // hence the inclusion of 'chunks' in variable name
        const numChunksToRead = Math.ceil(length / this._blockSize);
        // 1. find out block number the read offset it at
        // 2. blocknum == chunknum so read entire chunk and get iv
        // 3. decrypt chunk with attaned iv.
        //
        // TODO: maybe actually better to call is a chunk
        const startChunkNum = this._offsetToBlockNum(position);
        let chunkCtr = 0;
        const plaintextBlocks = [];
        const lowerFd = this._getLowerFd(fd);
        const metadata = this._getMetadata(fd);
        if (position + length > metadata.size) {
            length = metadata.size - position;
        }
        for (const chunkNum = startChunkNum; chunkCtr < numChunksToRead; chunkCtr++) {
            const chunkOffset = this._chunkNumToOffset(chunkNum + chunkCtr);
            let chunkBuf = Buffer.alloc(this._chunkSize);
            this._lowerDir.readSync(lowerFd, chunkBuf, 0, this._chunkSize, chunkOffset);
            // extract the iv from beginning of chunk
            const iv = chunkBuf.slice(0, this._initVectorSize);
            // extract remaining data which is the cipher text
            const chunkData = chunkBuf.slice(this._initVectorSize);
            const ptBlock = this._cryptor.decryptSync(chunkData, iv);
            plaintextBlocks.push(ptBlock);
        }
        const decryptedReadBuffer = Buffer.concat(plaintextBlocks, numChunksToRead * this._blockSize);
        // offset into the decryptedReadBuffer to read from
        const startBlockOffset = position & this._blockSize - 1;
        decryptedReadBuffer.copy(buffer, offset, startBlockOffset, length);
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
        return length;
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
    write(fd, data, offset = undefined, length = undefined, position = undefined, callback) {
        // Define defaults
        const buffer = (typeof data === 'string') ? Buffer.from(data) : data;
        offset = offset !== undefined ? offset : 0;
        length = length !== undefined ? length : buffer.length;
        position = position !== undefined ? position : 0;
        const efsFd = this._fileDescriptors.get(fd);
        const lowerFd = this._getLowerFd(fd);
        const boundaryOffset = position & this._blockSize - 1;
        const numBlocksToWrite = Math.ceil((length + boundaryOffset) / this._blockSize);
        const startBlockNum = this._offsetToBlockNum(position);
        const endBlockNum = startBlockNum + numBlocksToWrite - 1;
        const startBlockOverlaySize = this._blockSize - boundaryOffset;
        const startBlockOverlay = buffer.slice(offset, startBlockOverlaySize);
        let startBlock = this._overlaySegment(fd, startBlockOverlay, position);
        let middleBlocks = Buffer.allocUnsafe(0);
        let endBlock = Buffer.allocUnsafe(0);
        let endBlockBufferOffset = 0;
        if (numBlocksToWrite >= 2) {
            endBlockBufferOffset = startBlockOverlaySize + (numBlocksToWrite - 2) * this._blockSize;
            const endBlockOverlay = buffer.slice(offset + endBlockBufferOffset);
            const endBlockOffset = this._blockNumToOffset(endBlockNum);
            endBlock = this._overlaySegment(fd, endBlockOverlay, endBlockOffset);
        }
        if (numBlocksToWrite >= 3) {
            middleBlocks = buffer.slice(startBlockOverlaySize, endBlockBufferOffset);
        }
        const newBlocks = Buffer.concat([startBlock, middleBlocks, endBlock]);
        this._upperDir.write(fd, newBlocks, 0, newBlocks.length, this._blockNumToOffset(startBlockNum), (err, bytesWritten, writeBuf) => {
            const blockIter = this._blockGenerator(newBlocks);
            const encryptedChunks = [];
            for (let block of blockIter) {
                const iv = this._cryptor.getRandomInitVectorSync();
                const ctBlock = this._cryptor.encryptSync(block, iv);
                const chunk = Buffer.concat([iv, ctBlock], this._chunkSize);
                encryptedChunks.push(chunk);
            }
            const encryptedWriteBuffer = Buffer.concat(encryptedChunks, numBlocksToWrite * this._chunkSize);
            const lowerWritePos = this._chunkNumToOffset(startBlockNum);
            this._lowerDir.write(lowerFd, encryptedWriteBuffer, 0, encryptedWriteBuffer.length, lowerWritePos, (err, bytesWritten, writeBuf) => {
                if (err) {
                    console.log(`error: ${err}`);
                }
                if (callback !== undefined) {
                    callback(null, length, buffer);
                }
            });
        });
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
    writeSync(fd, data, offset, length, position) {
        // Define defaults
        const buffer = (typeof data === 'string') ? Buffer.from(data) : data;
        offset = offset !== undefined ? offset : 0;
        length = length !== undefined ? length : buffer.length;
        position = position !== undefined ? position : 0;
        const efsFd = this._fileDescriptors.get(fd);
        const lowerFd = this._getLowerFd(fd);
        // Get block boundary conditions
        const boundaryOffset = position & this._blockSize - 1; // how far from a block boundary our write is
        const numBlocksToWrite = Math.ceil((length + boundaryOffset) / this._blockSize);
        const startBlockNum = this._offsetToBlockNum(position);
        const endBlockNum = startBlockNum + numBlocksToWrite - 1;
        // Get overlay conditions
        const startBlockOverlaySize = this._blockSize - boundaryOffset;
        // TODO: this should not be using the offsets. That pertains to the file, not this buffer.
        const startBlockOverlay = buffer.slice(offset, startBlockOverlaySize);
        let startBlock = this._overlaySegment(fd, startBlockOverlay, position);
        let middleBlocks = Buffer.allocUnsafe(0);
        let endBlock = Buffer.allocUnsafe(0);
        // only bother if there is a last chunk
        let endBlockBufferOffset = 0;
        if (numBlocksToWrite >= 2) {
            endBlockBufferOffset = startBlockOverlaySize + (numBlocksToWrite - 2) * this._blockSize;
            const endBlockOverlay = buffer.slice(offset + endBlockBufferOffset);
            const endBlockOffset = this._blockNumToOffset(endBlockNum);
            endBlock = this._overlaySegment(fd, endBlockOverlay, endBlockOffset);
        }
        // slice out middle blocks if they actually exist
        if (numBlocksToWrite >= 3) {
            middleBlocks = buffer.slice(startBlockOverlaySize, endBlockBufferOffset);
        }
        // TODO: assert newBlocks is a multiple of blocksize
        const newBlocks = Buffer.concat([startBlock, middleBlocks, endBlock]);
        this._upperDir.writeSync(fd, newBlocks, 0, newBlocks.length, this._blockNumToOffset(startBlockNum));
        const blockIter = this._blockGenerator(newBlocks);
        const encryptedChunks = [];
        for (let block of blockIter) {
            const iv = this._cryptor.getRandomInitVectorSync();
            const ctBlock = this._cryptor.encryptSync(block, iv);
            const chunk = Buffer.concat([iv, ctBlock], this._chunkSize);
            encryptedChunks.push(chunk);
        }
        const encryptedWriteBuffer = Buffer.concat(encryptedChunks, numBlocksToWrite * this._chunkSize);
        const lowerWritePos = this._chunkNumToOffset(startBlockNum);
        this._lowerDir.writeSync(lowerFd, encryptedWriteBuffer, 0, encryptedWriteBuffer.length, lowerWritePos);
        const newFileSize = position + length;
        if (newFileSize > this._getMetadata(fd).size) {
            this._getMetadata(fd).size = newFileSize;
            this._writeMetadataSync(fd);
        }
        return length;
    }
    /**
     * Asynchronously append data to a file, creating the file if it does not exist.
     * @param path string | number. Path to the file or directory.
     * @param data string | Buffer. The data to be appended.
     * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined }.
     * Default options are: { encoding: "utf8", mode: 0o666, flag: "w" }.
     * @returns Promise<void>.
     */
    async appendFile(path, data, options, callback) {
        if (!callback && typeof options === 'function') {
            callback = options;
        }
        else if (!callback) {
            throw Error("A callback must be provided for async operation");
        }
        if (typeof options === 'object') {
            options = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" }, options);
        }
        else {
            options = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" });
        }
        if (!options.flag || this._isFileDescriptor(path)) {
            options.flag = "a";
        }
        this._lowerDir.appendFile(path, data, options, callback);
    }
    /**
     * Synchronously append data to a file, creating the file if it does not exist.
     * @param path string | number. Path to the file or directory.
     * @param data string | Buffer. The data to be appended.
     * @param options FileOptions: { encoding: CharacterEncodingString mode: number | undefined flag: string | undefined }.
     * Default options are: { encoding: "utf8", mode: 0o666, flag: "w" }.
     * @returns Promise<void>.
     */
    appendFileSync(path, data, options) {
        if (typeof options === 'object') {
            options = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" }, options);
        }
        else {
            options = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" });
        }
        if (!options.flag || this._isFileDescriptor(path)) {
            options.flag = "a";
        }
        this._lowerDir.appendFileSync(path, data, options);
    }
    /**
     * Asynchronously changes the access permissions of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param mode number. New permissions set.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    chmod(path, mode = 0, callback) {
        this._upperDir.chmod(path, mode, (err) => {
            if (err !== null) {
                callback(err);
            }
            else {
                this._lowerDir.chmod(path, mode, callback);
            }
        });
    }
    /**
     * Synchronously changes the access permissions of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param mode number. New permissions set.
     * @returns void.
     */
    chmodSync(path, mode = 0) {
        this._upperDir.chmodSync(path, mode);
        this._lowerDir.chmodSync(path, mode);
    }
    /**
     * Synchronously changes the owner or group of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    chown(path, uid, gid, callback) {
        this._upperDir.chown(path, uid, gid, (err) => {
            if (err) {
                callback(err);
            }
            else {
                this._lowerDir.chown(path, uid, gid, callback);
            }
        });
    }
    /**
     * Synchronously changes the owner or group of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @returns void.
     */
    chownSync(path, uid, gid) {
        this._upperDir.chownSync(path, uid, gid);
        this._lowerDir.chownSync(path, uid, gid);
    }
    /**
     * Synchronously and recursively changes the owner or group of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @param callback (err: NodeJS.ErrnoException) => void.
     * @returns void.
     */
    chownr(path, uid, gid, callback) {
        return this._upperDir.chownr(path, uid, gid, callback);
    }
    /**
     * Synchronously and recursively changes the owner or group of the file system object described by path.
     * @param path string. Path to the fs object.
     * @param uid number. User identifier.
     * @param gid number. Group identifier.
     * @returns void.
     */
    chownrSync(path, uid, gid) {
        return this._upperDir.chownrSync(path, uid, gid);
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
    async writeFile(path, data, options = {}, callback) {
        let callbackFinal;
        let optionsFinal;
        if (!callback && typeof options === 'function') {
            callbackFinal = options;
        }
        else if (callback) {
            callbackFinal = callback;
        }
        else {
            throw Error("A callback must be provided for async operation");
        }
        if (typeof options === 'object') {
            optionsFinal = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" }, options);
        }
        else {
            optionsFinal = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "a" });
        }
        const flag = optionsFinal.flag || "w";
        if (this._isFileDescriptor(path)) {
            writeFd(path, true);
            return;
        }
        this.open(path, flag, 0o666, (err, fd) => {
            if (err) {
                callbackFinal(err);
            }
            else {
                writeFd(fd, false);
            }
        });
        const self = this;
        function writeFd(fd, isUserFd) {
            const dataBuffer = (typeof data === 'string') ? Buffer.from(data) : data;
            const writeBuf = self._isTypedArray(dataBuffer) ? dataBuffer : Buffer.from(dataBuffer.toString(), optionsFinal.encoding || "utf8");
            // TODO: typescript has a cry about this, come back to this later
            // const position = /a/.test(flag) ? null : 0
            let position = 0;
            self._writeAll(fd, isUserFd, writeBuf, 0, writeBuf.byteLength, position, callback);
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
    writeFileSync(path, data, options) {
        options = this._getFileOptions({ encoding: "utf8", mode: 0o666, flag: "w" }, options);
        const flag = options.flag || "w";
        const isUserFileDescriptor = this._isFileDescriptor(path);
        let fd;
        if (isUserFileDescriptor) {
            fd = path;
        }
        else if (typeof path === 'string') {
            fd = this.openSync(path, flag, options.mode);
        }
        else {
            throw Error('Invalid path or file descriptor');
        }
        let offset = 0;
        if (typeof data === 'string') {
            data = Buffer.from(data);
        }
        let length = data.byteLength;
        // TODO: typescript has a cry about this, come back to this later
        // let position = /a/.test(flag) ? null : 0
        let position = 0;
        try {
            while (length > 0) {
                const written = this.writeSync(fd, data, offset, length, position);
                offset += written;
                length -= written;
                if (position !== null) {
                    position += written;
                }
            }
        }
        finally {
            if (isUserFileDescriptor) {
                this._lowerDir.closeSync(fd);
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
    open(path, flags = "r", mode = 0o666, callback) {
        let upperFd = undefined;
        try {
            const lowerFlags = flags[0] === "w" ? "w+" : "r+";
            const lowerFd = this._lowerDir.openSync(path, lowerFlags, mode);
            const dirPath = path_1.default.dirname(path);
            this._upperDir.mkdirpSync(dirPath);
            this._lowerDir.mkdirSync(dirPath, { recursive: true });
            const upperFilePath = path_1.default.resolve(path);
            if (flags[0] === "r" && !this._upperDir.existsSync(upperFilePath)) {
                this._upperDir.closeSync(this._upperDir.openSync(upperFilePath, "w"));
            }
            upperFd = this._upperDir.openSync(upperFilePath, flags, mode);
            const efsFd = new FileDescriptor_1.default(lowerFd, upperFd, flags);
            this._fileDescriptors.set(upperFd, efsFd);
            if (flags[0] === "r") {
                this._loadMetadata(upperFd);
            }
            else if (flags[0] === "w") {
                const hash = this._cryptor.hashSync(this._key);
                this._metadata[upperFd] = { keyHash: hash, size: 0 };
                this._writeMetadataSync(upperFd);
            }
            callback(null, upperFd);
        }
        catch (err) {
            callback(err, upperFd);
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
    openSync(path, flags = "r", mode = 0o666) {
        const pathString = (typeof path === 'string') ? path : ((path.constructor === Buffer) ? path.toString() : this._getPathFromURL(path));
        const lowerFlags = flags[0] === "w" ? "w+" : "r+";
        let lowerFd;
        lowerFd = this._lowerDir.openSync(pathString, lowerFlags, mode);
        const dirPath = path_1.default.dirname(pathString);
        this._upperDir.mkdirpSync(dirPath);
        this._lowerDir.mkdirSync(dirPath, { recursive: true });
        const upperFilePath = path_1.default.resolve(pathString);
        if (flags[0] === "r" && !this._upperDir.existsSync(upperFilePath)) {
            this._upperDir.closeSync(this._upperDir.openSync(upperFilePath, "w"));
        }
        const upperFd = this._upperDir.openSync(upperFilePath, flags, mode);
        const efsFd = new FileDescriptor_1.default(lowerFd, upperFd, flags);
        this._fileDescriptors.set(upperFd, efsFd);
        if (flags[0] === "r") {
            this._loadMetadata(upperFd);
        }
        else if (flags[0] === "w") {
            const hash = this._cryptor.hashSync(this._key);
            this._metadata[upperFd] = { keyHash: hash, size: 0 };
            this._writeMetadataSync(upperFd);
        }
        return upperFd;
    }
    /**
     * Get key used for encryption.
     * @returns Buffer | string (Key)
     */
    getKey() {
        return this._key;
    }
    _maybeCallback(cb) {
        if (typeof cb === "function")
            return cb;
        throw Error("invalid callback");
    }
    _getFileOptions(defaultOptions, options) {
        let optionsFinal = defaultOptions;
        if (typeof options === "string") {
            if (!this._isCharacterEncoding(options)) {
                throw Error('Invalid encoding string');
            }
            return { ...defaultOptions, encoding: options };
        }
        if (options) {
            if (options.encoding) {
                if (this._isCharacterEncoding(options.encoding)) {
                    optionsFinal = { ...optionsFinal, encoding: options.encoding };
                }
                else {
                    throw Error('Invalid encoding string');
                }
            }
            if (options.flag) {
                optionsFinal = { ...optionsFinal, flag: options.flag };
            }
            if (options.mode) {
                optionsFinal = { ...optionsFinal, mode: options.mode };
            }
        }
        return optionsFinal;
    }
    _getStreamOptions(defaultOptions, options) {
        let optionsFinal = defaultOptions;
        if (typeof options === "string") {
            if (!this._isCharacterEncoding(options)) {
                throw Error('Invalid encoding string');
            }
            return { ...defaultOptions, encoding: options };
        }
        if (options) {
            if (options.highWaterMark) {
                optionsFinal = { ...optionsFinal, highWaterMark: options.highWaterMark };
            }
            if (options.flags) {
                optionsFinal = { ...optionsFinal, flags: options.flags };
            }
            if (options.encoding) {
                if (this._isCharacterEncoding(options.encoding)) {
                    optionsFinal = { ...optionsFinal, encoding: options.encoding };
                }
                else {
                    throw Error('Invalid encoding string');
                }
            }
            if (options.fd) {
                optionsFinal = { ...optionsFinal, fd: options.fd };
            }
            if (options.mode) {
                optionsFinal = { ...optionsFinal, mode: options.mode };
            }
            if (options.autoClose) {
                optionsFinal = { ...optionsFinal, autoClose: options.autoClose };
            }
            if (options.start) {
                optionsFinal = { ...optionsFinal, start: options.start };
            }
            if (options.end) {
                optionsFinal = { ...optionsFinal, end: options.end };
            }
        }
        return optionsFinal;
    }
    _isCharacterEncoding(encoding) {
        if (encoding == null || encoding == undefined) {
            return true;
        }
        return ['ascii', 'utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 'base64', 'latin1', 'binary', 'hex'].includes(encoding);
    }
    _isTypedArray(array) {
        return ArrayBuffer.isView(array) && !(array instanceof DataView);
    }
    _writeAll(fd, isUserFd, buffer, offset, length, position, callback) {
        if (typeof buffer === 'string') {
            buffer = Buffer.from(buffer);
        }
        this.write(fd, buffer, offset, length, position, (writeErr, written) => {
            if (writeErr) {
                if (isUserFd) {
                    callback(writeErr);
                }
                else {
                    this.close(fd, () => {
                        callback(writeErr);
                    });
                }
            }
            else if (written === length) {
                if (isUserFd) {
                    callback(null);
                }
                else {
                    this.close(fd, callback);
                }
            }
            else {
                offset += written;
                length -= written;
                if (position !== null) {
                    position += written;
                }
                this._writeAll(fd, isUserFd, buffer, offset, length, position, callback);
            }
        });
    }
    // ========= HELPER FUNCTIONS =============
    // TODO: does there need to be a an async version of this for async api methods?
    /**
     * Reads the whole block that the position lies within.
     * @param fd File descriptor.
     * @param position Position of data required.
     * @returns Buffer.
     */
    _readBlock(fd, position) {
        // Returns zero buffer if file has no content
        if (this._positionOutOfBounds(fd, position)) {
            return Buffer.alloc(this._blockSize);
        }
        const blockNum = this._offsetToBlockNum(position);
        const blockOffset = this._blockNumToOffset(blockNum);
        // TODO: optimisation: if we can ensure that readSync will always write blockSize, then we can use allocUnsafe
        const blockBuf = Buffer.alloc(this._blockSize);
        this.readSync(fd, blockBuf, 0, this._blockSize, blockOffset);
        return blockBuf;
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
    _overlaySegment(fd, newData, position) {
        // 	case 1:  segment is aligned to start of block
        // 	case 2:  segment is aligned to start-of-block but end before end-of-block
        // 	case 3:  segment is not aligned to start and ends before end-of-block
        // 	case 4:  segment is not aligned to start-of-block and ends at end-of-block
        //
        // 	Cases 3 and 4 are not possible when overlaying the last segment
        //
        // TODO: throw err if buff length  > block size
        const writeOffset = position & (this._blockSize - 1); // byte offset from where to start writing new data in the block
        // read entire block, position belongs to
        const origBlock = this._readBlock(fd, position);
        let startSlice = Buffer.alloc(0);
        // Populate array if newData is not block aligned
        const isBlockAligned = ((position & this._blockSize - 1) === 0);
        if (!isBlockAligned) {
            startSlice = origBlock.slice(0, writeOffset);
        }
        // Any data reamining after new block
        const endSlice = origBlock.slice(writeOffset + newData.length);
        // patch up slices to create new block
        // TODO: specify length -- maybe also assert the 3 segments do infact amount to only blocksize
        const newBlock = Buffer.concat([startSlice, newData, endSlice]);
        // TODO: assert that newBlock is === blockSize
        return newBlock;
    }
    /**
     * Checks if path is a file descriptor (number) or not (string).
     * @param path Path of file.
     * @returns boolean
     */
    _isFileDescriptor(path) {
        if (typeof path === 'number') {
            if (this._fileDescriptors.has(path)) {
                return true;
            }
        }
        return false;
    }
    /**
     * Takes the position in to a file and returns the block number that 'position' lies in.
     * @param fd File descriptor.
     * @returns number
     */
    _getLowerFd(fd) {
        if (this._fileDescriptors.has(fd)) {
            const efsFd = this._fileDescriptors.get(fd);
            if (efsFd) {
                const lowerFd = efsFd.getLowerFd();
                if (lowerFd) {
                    return lowerFd;
                }
                else {
                    throw Error("efs file descriptor is undefined");
                }
            }
            else {
                throw Error("efs file descriptor is undefined");
            }
        }
        else {
            throw Error("efs file descriptor does not exist");
        }
    }
    /**
     * Takes a position in a file and returns the block number that 'position' lies in.
     * @param position
     * @returns number (Block number)
     */
    _offsetToBlockNum(position) {
        // we use blockSize as opposed to chunkSize because chunk contains metadata
        // transparent to user. When user specifies position it is as if it were plaintext
        return Math.floor(position / this._blockSize);
    }
    /**
     * Calculates the offset/position of the block number in the unencrypted file.
     * @param blockNum Block number.
     * @returns number (position offset)
     */
    _blockNumToOffset(blockNum) {
        return (blockNum * this._blockSize);
    }
    /**
     * Calculates the offset/position of the chunk number in the unencrypted file.
     * @param chunkNum Chunk number.
     * @returns number (position offset)
     */
    _chunkNumToOffset(chunkNum) {
        return (chunkNum * this._chunkSize);
    }
    /**
     * Calculates the offset/position of the chunk number in the unencrypted file.
     * @param chunkNum Chunk number.
     * @returns number (position offset)
     */
    _offsetToChunkNum(position) {
        return Math.floor(position / this._chunkSize);
    }
    /**
     * Creates a block generator for block iteration, split is per block length.
     * @param blocks Buffer containing blocks to be split.
     * @param blockSize Size of an individual block.
     * @returns IterableIterator<Buffer> (the iterator for the blocks split into buffer.length/blockSize blocks)
     */
    *_blockGenerator(blocks, blockSize = this._blockSize) {
        let iterCount = 0;
        let currOffset = 0;
        while (currOffset < blocks.length) {
            yield blocks.slice(currOffset, currOffset + blockSize);
            currOffset += blockSize;
            iterCount++;
        }
    }
    /**
     * Creates a chunk generator for chunk iteration, split is per block length.
     * @param chunks Buffer containing blocks to be split.
     * @param chunkSize Size of an individual block.
     * @returns IterableIterator<Buffer> (the iterator for the chunks split into buffer.length/chunkSize blocks)
     */
    *_chunkGenerator(chunks, chunkSize = this._chunkSize) {
        let iterCount = 0;
        let currOffset = 0;
        while (currOffset < chunks.length) {
            yield chunks.slice(currOffset, currOffset + chunkSize);
            currOffset += chunkSize;
            iterCount++;
        }
    }
    /**
     * Checks if the position is out of bounds for a given file (fd).
     * @param fd File descriptor.
     * @param position Position in question.
     * @returns boolean (true if position is out of bounds, false if position is within bounds)
     */
    _positionOutOfBounds(fd, position) {
        // TODO: confirm that '>=' is correct here
        const _isPositionOutOfBounds = (position >= this._lowerDir.fstatSync(fd).size);
        return _isPositionOutOfBounds;
    }
    /**
     * Synchronously checks if file (fd) contains conntent or not.
     * @param fd File descriptor.
     * @returns boolean (true if file has content, false if file has no content)
     */
    _hasContentSync(fd) {
        const _hasContent = (this._lowerDir.fstatSync(fd).size !== 0);
        return _hasContent;
    }
    /**
     * Synchronously checks for file size.
     * @param fd File descriptor.
     * @returns boolean (true if file has content, false if file has no content)
     */
    _getPostWriteFileSize(fd, position, length) {
        const fileMeta = this._metadata[fd];
        const newSize = position + length;
        const fileSize = fileMeta.size;
        if (newSize > fileSize) {
            fileMeta.size = newSize;
            return newSize;
        }
        else {
            return fileSize;
        }
    }
    _writeMetadataSync(fd) {
        const iv = this._cryptor.getRandomInitVectorSync();
        const metadata = this._getMetadata(fd);
        const serialMeta = JSON.stringify(metadata);
        const metadataBlk = Buffer.concat([Buffer.from(serialMeta)], this._blockSize);
        const ctMetadata = this._cryptor.encryptSync(metadataBlk, iv);
        const metaChunk = Buffer.concat([iv, ctMetadata], this._chunkSize);
        const metadataOffset = this._getMetadataOffsetSync(fd);
        this._lowerDir.writeSync(this._getLowerFd(fd), metaChunk, 0, metaChunk.length, metadataOffset);
    }
    _loadMetadata(fd) {
        const metaChunk = Buffer.allocUnsafe(this._chunkSize);
        const metaChunkOffset = this._getMetadataOffsetSync(fd);
        this._lowerDir.readSync(this._getLowerFd(fd), metaChunk, 0, metaChunk.length, metaChunkOffset);
        const iv = metaChunk.slice(0, this._initVectorSize);
        const metaCt = metaChunk.slice(this._initVectorSize);
        const metaPlain = this._cryptor.decryptSync(metaCt, iv);
        const metaPlainTrimmed = metaPlain.slice(0, (metaPlain.indexOf('\0')));
        const fileMeta = eval("(" + metaPlainTrimmed.toString() + ")");
        this._metadata[fd] = fileMeta;
    }
    _getMetadata(fd) {
        if (lodash_1.default.has(this._metadata, fd)) {
            const fileMeta = this._metadata[fd];
            if (fileMeta) {
                return fileMeta;
            }
        }
        throw Error("file descriptor has no metadata stored");
    }
    _getMetaField(fd, fieldName) {
        const fileMeta = this._getMetadata(fd);
        if (lodash_1.default.has(fileMeta, fieldName)) {
            const fieldVal = fileMeta[fieldName];
            if (fieldVal != null) {
                return fieldVal;
            }
        }
        throw Error("Field does not exist");
    }
    _getMetadataOffsetSync(fd) {
        const efsFd = this._getEfsFd(fd);
        const stats = this._lowerDir.fstatSync(this._getLowerFd(fd));
        const size = stats.size;
        if (efsFd.getFlags()[0] === "w") {
            return size;
        }
        const numBlocks = size / this._chunkSize;
        return this._chunkNumToOffset(numBlocks - 1);
    }
    _getEfsFd(fd) {
        if (this._fileDescriptors.has(fd)) {
            const efsFd = this._fileDescriptors.get(fd);
            if (efsFd) {
                return efsFd;
            }
        }
        throw Error("file descriptor has no metadata stored");
    }
    /**
     * Processes path types and collapses it to a string.
     * The path types can be string or Buffer or URL.
     * @private
     */
    _getPath(path) {
        if (typeof path === 'string') {
            return path;
        }
        if (path instanceof Buffer) {
            return path.toString();
        }
        if (typeof path === 'object' && typeof path.pathname === 'string') {
            return this._getPathFromURL(path);
        }
        throw new TypeError('path must be a string or Buffer or URL');
    }
    /**
     * Acquires the file path from an URL object.
     * @private
     */
    _getPathFromURL(url) {
        if (lodash_1.default.has(url, 'hostname')) {
            throw new TypeError('ERR_INVALID_FILE_URL_HOST');
        }
        const pathname = url.pathname;
        if (pathname.match(/%2[fF]/)) {
            // must not allow encoded slashes
            throw new TypeError('ERR_INVALID_FILE_URL_PATH');
        }
        return decodeURIComponent(pathname);
    }
}
exports.default = EncryptedFS;
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
//# sourceMappingURL=EncryptedFS.js.map