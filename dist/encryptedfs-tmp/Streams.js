"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
const process_1 = require("process");
const stream_1 = require("stream");
const constants_1 = require("./constants");
/**
 * Class representing a ReadStream.
 * @extends Readable
 */
class ReadStream extends stream_1.Readable {
    /**
     * Creates ReadStream.
     * It will asynchronously open the file descriptor if a file path was passed in.
     * It will automatically close the opened file descriptor by default.
     */
    constructor(path, options, fs) {
        var _a;
        super({
            highWaterMark: options.highWaterMark,
            encoding: options.encoding
        });
        this._fs = fs;
        // this._fs = fs._upperDir
        this.bytesRead = 0;
        this.path = path;
        this.fd = (options.fd === undefined) ? null : options.fd;
        this.flags = (options.flags === undefined) ? 'r' : options.flags;
        this.mode = (options.mode === undefined) ? constants_1.DEFAULT_FILE_PERM : options.mode;
        this.autoClose = (options.autoClose === undefined) ? true : options.autoClose;
        this.start = options.start;
        this.end = (options.end === undefined) ? Infinity : options.end;
        this.pos = (_a = options.start) !== null && _a !== void 0 ? _a : 0;
        if (typeof this.fd !== 'number') {
            this._open();
        }
        super.on('end', () => {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }
    /**
     * Open file descriptor if ReadStream was constructed from a file path.
     * @private
     */
    _open() {
        this._fs.open(this.path, this.flags, this.mode, (e, fd) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                super.emit('error', e);
                return;
            }
            this.fd = fd;
            super.emit('open', fd);
            super.read();
        });
    }
    /**
     * Asynchronous read hook for stream implementation.
     * The size passed into this function is not the requested size, but the high watermark.
     * It's just a heuristic buffering size to avoid sending to many syscalls.
     * However since this is an in-memory filesystem, the size itself is irrelevant.
     * @private
     */
    _read(size) {
        if (typeof this.fd !== 'number') {
            super.once('open', () => {
                this._read(size);
            });
            return;
        }
        if (this.destroyed) {
            return;
        }
        // this.pos is only ever used if this.start is specified
        if (this.pos != null) {
            size = Math.min(this.end - this.pos + 1, size);
        }
        // console.log(`size = ${size}`)
        if (size <= 0) {
            // console.log('size was zero!')
            this.push(null);
            return;
        }
        this._fs.readSync;
        this._fs.read(this.fd, buffer_1.Buffer.allocUnsafe(size), 0, size, this.pos, (err, bytesRead, buffer) => {
            if (err) {
                if (this.autoClose) {
                    this.destroy();
                }
                super.emit('error', err);
                return;
            }
            if (bytesRead > 0) {
                this.bytesRead += bytesRead;
                this.push(buffer.slice(0, bytesRead));
            }
            else {
                this.push(null);
            }
        });
        if (this.pos != null) {
            this.pos += size;
        }
    }
    /**
     * Destroy hook for stream implementation.
     * @private
     */
    _destroy(e, cb) {
        this._close((e_) => {
            cb(e || e_);
        });
    }
    /**
     * Close file descriptor if ReadStream was constructed from a file path.
     * @private
     */
    _close(cb) {
        if (cb) {
            super.once('close', cb);
        }
        if (typeof this.fd !== 'number') {
            super.once('open', () => {
                this._close(null);
            });
            return;
        }
        if (this.closed) {
            return process_1.nextTick(() => super.emit('close'));
        }
        this.closed = true;
        this._fs.close(this.fd, (e) => {
            if (e) {
                this.emit('error', e);
            }
            else {
                this.emit('close');
            }
        });
        this.fd = null;
    }
}
exports.ReadStream = ReadStream;
/**
 * Class representing a WriteStream.
 * @extends Writable
 */
class WriteStream extends stream_1.Writable {
    /**
     * Creates WriteStream.
     */
    constructor(path, options, fs) {
        var _a;
        super({
            highWaterMark: options.highWaterMark
        });
        this._fs = fs;
        // this._fs = fs._upperDir
        this.bytesWritten = 0;
        this.path = path;
        this.fd = options.fd === undefined ? null : options.fd;
        this.flags = options.flags === undefined ? 'w' : options.flags;
        this.mode = options.mode === undefined ? constants_1.DEFAULT_FILE_PERM : options.mode;
        this.autoClose = options.autoClose === undefined ? true : options.autoClose;
        this.start = (_a = options.start) !== null && _a !== void 0 ? _a : 0;
        this.pos = this.start; // WriteStream maintains its own position
        if (options.encoding) {
            super.setDefaultEncoding(options.encoding);
        }
        if (typeof this.fd !== 'number') {
            this._open();
        }
        super.on('finish', () => {
            if (this.autoClose) {
                this.destroy();
            }
        });
    }
    /**
     * Open file descriptor if WriteStream was constructed from a file path.
     * @private
     */
    _open() {
        this._fs.open(this.path, this.flags, this.mode, (e, fd) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                super.emit('error', e);
                return;
            }
            this.fd = fd;
            super.emit('open', fd);
        });
    }
    /**
     * Asynchronous write hook for stream implementation.
     * @private
     */
    // $FlowFixMe: _write hook adapted from Node `lib/internal/fs/streams.js`
    _write(data, encoding, cb) {
        if (typeof this.fd !== 'number') {
            return super.once('open', () => {
                this._write(data, encoding, cb);
            });
        }
        this._fs.write(this.fd, data, 0, data.length, this.pos, (e, bytesWritten) => {
            if (e) {
                if (this.autoClose) {
                    this.destroy();
                }
                cb(e);
                return;
            }
            this.bytesWritten += bytesWritten;
            cb();
        });
        if (this.pos !== undefined) {
            this.pos += data.length;
        }
    }
    /**
     * Vectorised write hook for stream implementation.
     * @private
     */
    _writev(chunks, cb) {
        this._write(buffer_1.Buffer.concat(chunks.map((chunk) => chunk.chunk)), undefined, cb);
        return;
    }
    /**
     * Destroy hook for stream implementation.
     * @private
     */
    _destroy(e, cb) {
        this._close((e_) => {
            cb(e || e_);
        });
    }
    /**
     * Close file descriptor if WriteStream was constructed from a file path.
     * @private
     */
    _close(cb) {
        if (cb) {
            super.once('close', cb);
        }
        if (typeof this.fd !== 'number') {
            super.once('open', () => {
                this._close(null);
            });
            return;
        }
        if (this.closed) {
            return process_1.nextTick(() => super.emit('close'));
        }
        this.closed = true;
        this._fs.close(this.fd, (e) => {
            if (e) {
                this.emit('error', e);
            }
            else {
                this.emit('close');
            }
        });
        this.fd = null;
    }
    /**
     * Final hook for stream implementation.
     * @private
     */
    _final(cb) {
        cb();
        return;
    }
}
exports.WriteStream = WriteStream;
//# sourceMappingURL=Streams.js.map