"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import vfs from 'virtualfs'
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const Vault_1 = __importDefault(require("./Vault"));
const crypto_1 = __importDefault(require("crypto"));
const jsonfile_1 = __importDefault(require("jsonfile"));
const lodash_1 = __importDefault(require("lodash"));
const KeyManager_1 = __importDefault(require("./KeyManager"));
// TODO: convert sync to promises
/* const prom = {
  access: util.promisify(fs.access),
  mkdir: util.promisify(fs.mkdir)
} */
const vaultKeySize = 128 / 8; // in bytes
// TODO: key typescript public/private variables
class Polykey {
    // KeyManager = KeyManager
    constructor(km, keyLen = 32, homeDir = os_1.default.homedir(), altFS = fs_extra_1.default) {
        this._km = km;
        homeDir = homeDir || os_1.default.homedir();
        /*     this._pubKey = pubKey
            this._privKey = privKey */
        this._polykeyDirName = '.polykey';
        this._polykeyPath = path_1.default.join(homeDir, this._polykeyDirName);
        this._metadataPath = path_1.default.join(this._polykeyPath, 'metadata');
        this._fs = altFS;
        this._vaults = new Map();
        // this._key = this._loadKey(key)
        this._keySize = keyLen;
        this._metadata = {};
        this._initSync();
    }
    static get KeyManager() {
        return KeyManager_1.default;
    }
    async _fileExists(path) {
        return this._fs.pathExists(path);
        /*     try {
              await this._fs.access(path)
            } catch(e) {
              // access errors if file doesn't exist
              return false
            }
            return true */
    }
    async createVault(vaultName) {
        const path = path_1.default.join(this._polykeyPath, vaultName);
        let vaultExists;
        try {
            vaultExists = await this._fileExists(path);
        }
        catch (err) {
            throw err;
        }
        // TODO: we're just doubly throwing the error here
        if (vaultExists) {
            throw Error('Vault already exists!');
        }
        // Directory not present, create one
        try {
            await this._fs.mkdir(path);
            const vaultKey = crypto_1.default.randomBytes(vaultKeySize);
            this._metadata[vaultName] = { key: vaultKey, tags: [] };
            // TODO: this methods seems a bit magical
            await this._writeMetadata();
            const vault = new Vault_1.default(vaultName, vaultKey, this._polykeyPath);
            this._vaults.set(vaultName, vault);
        }
        catch (err) {
            // Delete vault dir and garbage collect
            await this.destroyVault(vaultName);
            throw err;
        }
    }
    async vaultExists(vaultName) {
        const path = path_1.default.join(this._polykeyPath, vaultName);
        const vaultExists = await fs_extra_1.default.pathExists(path);
        return vaultExists;
    }
    async destroyVault(vaultName) {
        // this is convenience function for removing all tags
        // and triggering garbage collection
        // destruction is a better word as we should ensure all traces is removed
        const path = path_1.default.join(this._polykeyPath, vaultName);
        // Remove directory on file system
        if (this._fs.existsSync(path)) {
            this._fs.rmdirSync(path, { recursive: true });
        }
        // Remaining garbage collection:
        // Remove vault from vaults map
        if (this._vaults.has(vaultName)) {
            this._vaults.delete(vaultName);
        }
        // Remove from metadata
        if (this._metadata.hasOwnProperty(vaultName)) {
            delete this._metadata[vaultName];
        }
        const successful = !this._fs.existsSync(path) && !this._vaults.has(vaultName) && !this._metadata.hasOwnProperty(vaultName);
        return successful;
    }
    /* Validates whether all the artefacts needed to operate
     * a Vault are present. Namely this the vault directory
     * and the metadata for the vault containg the key
    */
    async _validateVault(vaultName) {
        const existsMeta = lodash_1.default.has(this._metadata, vaultName);
        if (!existsMeta) {
            throw Error('Vault metadata does not exist');
        }
        const vaultPath = path_1.default.join(this._polykeyPath, vaultName);
        const existsFS = await this._fileExists(vaultPath);
        if (!existsFS) {
            throw Error('Vault directory does not exist');
        }
    }
    async addSecret(vaultName, secretName, secret) {
        let vault;
        try {
            vault = await this._getVault(vaultName);
        }
        catch (err) {
            throw err;
        }
        vault.addSecret(secretName, secret);
    }
    async getSecret(vaultName, secretName) {
        let vault;
        let secret;
        try {
            vault = await this._getVault(vaultName);
            secret = vault.getSecret(secretName);
        }
        catch (err) {
            throw err;
        }
        return secret;
    }
    removeItem() {
    }
    listItems() {
    }
    listVaults() {
    }
    tagVault() {
    }
    untagVault() {
    }
    shareVault() {
    }
    unshareVault() {
    }
    /* ============ HELPERS =============== */
    /*   _mkdirRecursiveSync (fileSys: Object, targetDir: string, { isRelativeToScript = false }: Object = {}) {
      const sep = Path.sep
      const initDir = Path.isAbsolute(targetDir) ? sep : ''
      // TODO: figure out what this actually does
      const baseDir = isRelativeToScript ? __dirname : '.'
      // relative dir
      let targetDirs
      if (initDir === '') {
        targetDirs = Path.resolve(Path.join(baseDir, targetDir)).split(sep)
      } else {
        targetDirs = targetDir.split(sep)
      }
      targetDirs.reduce((parentDir, childDir) => {
        let newDir = Path.join(parentDir, childDir)
        try {
          fileSys.mkdirSync(newDir)
        } catch (err) {
          if (err.code === 'EEXIST') {
            return newDir
          }
          if (err.code === 'ENOENT') { // Throw the original parentDir error on curDir `ENOENT` failure.
            throw new Error(`EACCES: permission denied, mkdir '${parentDir}'`)
          }
        }
        return newDir
      }, sep)
    }
    */
    async _writeMetadata() {
        try {
            await jsonfile_1.default.writeFile(this._metadataPath, this._metadata);
        }
        catch (err) {
            throw Error("Error writing vault key to config file");
        }
    }
    async _getVault(vaultName) {
        if (this._vaults.has(vaultName)) {
            const vault = this._vaults.get(vaultName);
            if (vault) {
                return vault;
            }
        }
        // vault not in map, create new instance
        try {
            await this._validateVault(vaultName);
        }
        catch (err) {
            throw err;
        }
        const vaultKey = this._metadata[vaultName].key;
        const vault = new Vault_1.default(vaultName, vaultKey, this._polykeyPath);
        this._vaults.set(vaultName, vault);
        return vault;
    }
    _initSync() {
        // check if .polykey exists
        //  make folder if doesn't
        if (!fs_extra_1.default.existsSync(this._polykeyPath)) {
            fs_extra_1.default.mkdirSync(this._polykeyPath);
            const metadataTemplate = {};
            jsonfile_1.default.writeFileSync(this._metadataPath, metadataTemplate);
            this._metadata = metadataTemplate;
        }
        else if (fs_extra_1.default.existsSync(this._metadataPath)) {
            this._metadata = jsonfile_1.default.readFileSync(this._metadataPath);
        }
    }
    // TODO: we don't even open the file here
    _loadKey(path, keySize = this._keySize) {
        if (path instanceof Buffer) {
            return path;
        }
        const keyBuf = this._fs.readFileSync(path);
        return keyBuf;
    }
}
exports.default = Polykey;
//# sourceMappingURL=Polykey.js.map