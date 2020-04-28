"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// $FlowFixMe
const futoin_hkdf_1 = __importDefault(require("futoin-hkdf"));
// $FlowFixMe
const EncryptedFS_1 = __importDefault(require("../encryptedfs-tmp/EncryptedFS"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const process_1 = __importDefault(require("process"));
const vfs = require('virtualfs');
class Vault {
    constructor(name, symKey, baseDir = path_1.default.join(os_1.default.homedir(), '.polykey')) {
        // how do we create pub/priv key pair?
        // do we use the same gpg pub/priv keypair
        const vfsInstance = new vfs.VirtualFS;
        this._keyLen = 32;
        this._key = this._genSymKey(symKey, this._keyLen);
        this._efs = new EncryptedFS_1.default(this._key, vfsInstance, vfsInstance, fs_1.default, process_1.default);
        this._name = name;
        this._vaultPath = path_1.default.join(baseDir, name);
        this._secrets = new Map();
        this._loadSecrets();
    }
    _loadSecrets() {
        const secrets = fs_1.default.readdirSync(this._vaultPath);
        for (const secret of secrets) {
            this._secrets.set(secret, null);
        }
    }
    _genSymKey(asymKey, keyLen) {
        return futoin_hkdf_1.default(asymKey, keyLen);
    }
    addSecret(secretName, secretBuf) {
        // TODO: check if secret already exists
        const writePath = path_1.default.join(this._vaultPath, secretName);
        // TODO: use aysnc methods
        const fd = this._efs.openSync(writePath, 'w');
        this._efs.writeSync(fd, secretBuf, 0, secretBuf.length, 0);
        this._secrets.set(secretName, secretBuf);
        // TODO: close file or use write file sync
    }
    getSecret(secretName) {
        if (this._secrets.has(secretName)) {
            const secret = this._secrets.get(secretName);
            if (secret) {
                return secret;
            }
            else {
                const secretPath = path_1.default.join(this._vaultPath, secretName);
                // TODO: this should be async
                const secretBuf = this._efs.readFileSync(secretPath, undefined);
                this._secrets.set(secretName, secretBuf);
                return secretBuf;
            }
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    removeSecret(secretName) {
        if (this._secrets.has(secretName)) {
            const successful = this._secrets.delete(secretName);
            if (successful) {
                return;
            }
            throw Error('Secret: ' + secretName + ' was not removed');
        }
        throw Error('Secret: ' + secretName + ' does not exist');
    }
    listSecrets() {
        let secrets = Array.from(this._secrets.keys());
        return secrets;
    }
    tagVault() {
    }
    untagVault() {
    }
    shareVault() {
    }
    unshareVault() {
    }
}
exports.default = Vault;
//# sourceMappingURL=Vault.js.map