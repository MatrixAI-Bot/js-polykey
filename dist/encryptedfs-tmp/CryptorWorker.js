"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const threads_1 = require("threads");
const crypto = __importStar(require("crypto"));
let _cipher;
let _decipher;
const _cryptorWorker = {
    init(algorithm, key, initVector) {
        _cipher = crypto.createCipheriv(algorithm, key, initVector);
        _decipher = crypto.createDecipheriv(algorithm, key, initVector);
    },
    updateCipher(algorithm, key, initVector, plainBuf) {
        return _cipher.update(plainBuf);
    },
    _resetCipher(algorithm, key, initVector) {
        _cipher = crypto.createCipheriv(algorithm, Buffer.from(key), Buffer.from(initVector));
    },
    updateDecipher(algorithm, key, initVector, plainBuf) {
        return _decipher.update(plainBuf);
    },
    _resetDecipher(algorithm, key, initVector) {
        _decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), Buffer.from(initVector));
    },
};
threads_1.expose(_cryptorWorker);
//# sourceMappingURL=CryptorWorker.js.map