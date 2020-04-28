"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto = __importStar(require("crypto"));
const threads_1 = require("threads");
// TODO: function docs
// interface CryptorParameters {
// 	key: Buffer | string
// 	initVector?: Buffer
// 	algorithm?: string
// 	useWebWorkers?: boolean
// }
class Cryptor {
    constructor(key, initVector = crypto.randomBytes(16), algorithm = 'aes-256-gcm', useWebWorkers = false) {
        this._algorithm = algorithm;
        this._initVector = initVector;
        // TODO: generate salt ?
        this._key = this._pbkdfSync(key);
        this._cipher = crypto.createCipheriv(algorithm, this._key, this._initVector);
        this._decipher = crypto.createDecipheriv(algorithm, this._key, this._initVector);
        // Async via Process or Web workers
        this._useWebWorkers = useWebWorkers;
        if (this._useWebWorkers) {
            threads_1.spawn(new threads_1.Worker("./CryptorWorker")).then((worker) => {
                this._cryptorWorker = worker;
                this._cryptorWorker.init(this._algorithm, this._key, this._initVector);
            });
        }
    }
    encryptSync(plainBuf, initVector) {
        if (initVector && (initVector !== this._initVector)) {
            this._resetCipherSync(initVector);
        }
        return this._cipher.update(plainBuf);
    }
    // TODO: needs iv param
    async encrypt(plainBuf, initVector = undefined, callback) {
        if (initVector && (initVector !== this._initVector)) {
            this._resetCipher(initVector);
        }
        let buffer;
        if (this._useWebWorkers && this._cryptorWorker) {
            buffer = await this._cryptorWorker.updateCipher(this._algorithm, this._key, this._initVector, plainBuf);
        }
        else {
            buffer = this._cipher.update(plainBuf);
        }
        callback(null, buffer);
    }
    decryptSync(cipherBuf, initVector) {
        if (initVector && (initVector !== this._initVector)) {
            this._resetDecipherSync(initVector);
        }
        return this._decipher.update(cipherBuf);
    }
    async decrypt(cipherBuf, initVector = undefined, callback) {
        if (initVector && (initVector !== this._initVector)) {
            await this._resetDecipher(initVector);
        }
        let buffer;
        if (this._useWebWorkers && this._cryptorWorker) {
            buffer = await this._cryptorWorker.updateDecipher(this._algorithm, this._key, this._initVector, cipherBuf);
        }
        else {
            buffer = this._decipher.update(cipherBuf);
        }
        callback(null, buffer);
    }
    decryptCommitSync() {
        return this._decipher.final();
    }
    async decryptCommit() {
        return this._decipher.final();
    }
    // TODO: should all of these be public methods?
    // ========= HELPER FUNCTIONS =============
    _resetCipherSync(initVector) {
        this._cipher = crypto.createCipheriv(this._algorithm, this._key, initVector);
        return;
    }
    async _resetCipher(initVector) {
        if (this._useWebWorkers && this._cryptorWorker) {
            return await this._cryptorWorker._resetCipher(this._algorithm, this._key, initVector);
        }
        else {
            this._cipher = crypto.createCipheriv(this._algorithm, this._key, this._initVector);
        }
        return;
    }
    _resetDecipherSync(initVector) {
        this._decipher = crypto.createDecipheriv(this._algorithm, this._key, initVector);
        return;
    }
    async _resetDecipher(initVector) {
        if (this._useWebWorkers && this._cryptorWorker) {
            return await this._cryptorWorker._resetCipher(this._algorithm, this._key, initVector);
        }
        else {
            this._decipher = crypto.createDecipheriv(this._algorithm, this._key, this._initVector);
        }
        return;
    }
    getRandomBytes(size) {
        return crypto.randomBytes(size);
    }
    getRandomInitVectorSync() {
        return crypto.randomBytes(16);
    }
    async getRandomInitVector() {
        return crypto.randomBytes(16);
    }
    _pbkdfSync(pass, salt = '', algo = 'sha256', keyLen = 32, numIterations = 10000) {
        return crypto.pbkdf2Sync(pass, salt, numIterations, keyLen, algo);
    }
    async _pbkdf(pass, salt = '', algo = 'sha256', keyLen = 32, numIterations = 10000, callback) {
        crypto.pbkdf2(pass, salt, numIterations, keyLen, algo, (err, key) => {
            callback(err, key);
        });
    }
    hashSync(data, outputEncoding = 'hex') {
        const hash = crypto.createHash('sha256');
        hash.update(data);
        return hash.digest();
    }
}
exports.default = Cryptor;
//# sourceMappingURL=Cryptor.js.map