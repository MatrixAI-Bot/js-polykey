"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @flow
const fs_extra_1 = __importDefault(require("fs-extra"));
const crypto_1 = __importDefault(require("crypto"));
const openpgp_1 = __importDefault(require("openpgp"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
class KeyManager {
    constructor() {
        // TODO: wouldn't keymanager have many sym keys keys to look after?
        this._keyPair = { private: '', public: '' };
        this._storePath = '~/.polykey/';
    }
    // return {private: string, public: string}
    async generateKeyPair(name, email, passphrase, numBits = 4096) {
        var options = {
            userIds: [{ name: name, email: email }],
            numBits: 4096,
            passphrase: passphrase
        };
        this._passphrase = passphrase;
        return new Promise((resolve, reject) => {
            openpgp_1.default.generateKey(options).then((key) => {
                const privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
                const pubkey = key.publicKeyArmored; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
                const keypair = { private: privkey, public: pubkey };
                resolve(keypair);
                // TODO: revocation signature?
                // var revocationSignature = key.revocationSignature // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
            }).catch((err) => {
                reject(err);
            });
        });
    }
    getKeyPair() {
        return this._keyPair;
    }
    getPublicKey() {
        return this._keyPair.public;
    }
    getPrivateKey() {
        return this._keyPair.private;
    }
    async loadPrivateKey(path, passphrase = '') {
        const key = (await fs_extra_1.default.readFile(path)).toString();
        this._keyPair.private = key;
        if (passphrase) {
            this._passphrase = passphrase;
        }
    }
    async loadPublicKey(path) {
        const key = (await fs_extra_1.default.readFile(path)).toString();
        this._keyPair.public = key;
    }
    async loadKeyPair(privPath, pubPath, passphrase = '') {
        await this.loadPrivateKey(privPath);
        await this.loadPublicKey(pubPath);
        if (passphrase) {
            this._passphrase;
        }
    }
    async storePrivateKey(path) {
        await fs_extra_1.default.writeFile(path, this._keyPair.private);
    }
    async storePublicKey(path) {
        await fs_extra_1.default.writeFile(path, this._keyPair.public);
    }
    // symmetric key generation
    generateKeySync(passphrase, salt = crypto_1.default.randomBytes(32)) {
        const [algo, keyLen, numIterations] = ['sha256', 256 / 8, 10000];
        this._key = crypto_1.default.pbkdf2Sync(passphrase, salt, numIterations, keyLen, algo);
        this._salt = salt;
        return this._key;
    }
    async generateKey(passphrase, salt = crypto_1.default.randomBytes(32)) {
        const [algo, keyLen, numIterations] = ['sha256', 256 / 8, 10000];
        this._key = await util_1.promisify(crypto_1.default.pbkdf2)(passphrase, salt, numIterations, keyLen, algo);
        this._salt = salt;
        return this._key;
    }
    loadKeySync(keyPath) {
        this._key = fs_extra_1.default.readFileSync(keyPath);
    }
    async loadKey(keyPath) {
        try {
            this._key = await fs_extra_1.default.readFile(keyPath);
        }
        catch (err) {
            throw Error('Reading key from disk');
        }
    }
    loadKeyBuffer(key) {
        this._key = key;
    }
    async storeKey(path, createPath) {
        if (!this._key) {
            throw Error('There is no key loaded');
        }
        try {
            if (createPath) {
                await fs_extra_1.default.outputFile(path, this._key);
            }
            else {
                await fs_extra_1.default.writeFile(path, this._key);
            }
        }
        catch (err) {
            throw Error('Writing key to disk');
        }
    }
    storeKeySync(path, createPath) {
        if (!this._key) {
            throw Error('There is no key loaded');
        }
        try {
            if (createPath) {
                fs_extra_1.default.outputFileSync(path, this._key);
            }
            else {
                fs_extra_1.default.writeFileSync(path, this._key);
            }
        }
        catch (err) {
            throw Error('Writing key to disk');
        }
    }
    async storeProfile(name, storeKey = false) {
        const profilePath = path_1.default.join(this._storePath, name);
        if (!this._key && !this._salt) {
            throw Error('There is nothing loaded to store');
        }
        try {
            const profileExists = await fs_extra_1.default.pathExists(profilePath);
            if (profileExists) {
                console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`);
            }
            else {
                await fs_extra_1.default.mkdirs(profilePath);
            }
            if (storeKey && this._key) {
                await fs_extra_1.default.writeFile(path_1.default.join(profilePath, 'key'), this._key);
            }
            if (this._salt) {
                await fs_extra_1.default.writeFile(path_1.default.join(profilePath, 'salt'), this._salt);
            }
        }
        catch (err) {
            throw Error('Writing profile');
        }
    }
    async storeProfileSync(name, storeKey = false) {
        const profilePath = path_1.default.join(this._storePath, name);
        if (!this._key && !this._salt) {
            throw Error('There is nothing loaded to warrant storage');
        }
        try {
            const profileExists = await fs_extra_1.default.pathExistsSync(profilePath);
            if (profileExists) {
                console.warn(`Writing to already existing profile: ${name}. Existing data will be overwritten.`);
            }
            else {
                await fs_extra_1.default.mkdirsSync(profilePath);
            }
            if (storeKey && this._key) {
                await fs_extra_1.default.writeFileSync(path_1.default.join(profilePath, 'key'), this._key);
            }
            if (this._salt) {
                await fs_extra_1.default.writeFileSync(path_1.default.join(profilePath, 'salt'), this._key);
            }
        }
        catch (err) {
            throw Error('Writing profile');
        }
    }
    async loadProfile(name, passphrase) {
        const profilePath = path_1.default.join(this._storePath, name);
        try {
            if (passphrase) {
                this._salt = await fs_extra_1.default.readFile(path_1.default.join(profilePath, 'salt'));
                // TODO: use async version
                this.generateKeySync(passphrase, this._salt);
                return;
            }
        }
        catch (err) {
            throw Error('Loading profile salt from disk');
        }
        try {
            this._key = await fs_extra_1.default.readFile(path_1.default.join(profilePath, 'key'));
        }
        catch (err) {
            throw Error('Loading profile key from disk');
        }
    }
    getKey() {
        return this._key;
    }
    isLoaded() {
        if (this._key) {
            return true;
        }
        return false;
    }
}
exports.default = KeyManager;
//# sourceMappingURL=KeyManager.js.map