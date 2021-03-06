import fs from 'fs';
import Path from 'path';
import git from 'isomorphic-git';
import GitClient from '../git/GitClient';
import { EncryptedFS } from 'encryptedfs';
import { Mutex } from 'async-mutex';

type VaultMetadata = {
  sharedPubKeys: string[];
};

class Vault {
  private key: Buffer;
  name: string;
  private efs: EncryptedFS;
  vaultPath: string;
  private secrets: Map<string, any>;
  private sharedPubKeys: Set<string>;
  private metadataPath: string;

  // Concurrency
  private mutex: Mutex = new Mutex();
  constructor(name: string, symKey: Buffer, baseDir: string) {
    // how do we create pub/priv key pair?
    // do we use the same gpg pub/priv keypair
    this.key = symKey;
    // Set filesystem
    const vfsInstance = new (require('virtualfs').VirtualFS)();

    this.efs = new EncryptedFS(this.key, vfsInstance, vfsInstance, fs, process);

    this.name = name;
    this.vaultPath = Path.join(baseDir, name);
    // make the vault directory
    this.efs.mkdirSync(this.vaultPath, { recursive: true });
    this.secrets = new Map();

    this.loadSecrets();

    // Load metadata
    this.metadataPath = Path.join(this.vaultPath, '.vault', 'metadata');
    this.loadMetadata();
  }

  /**
   * Returns the Encrypted File System used for vault operations
   */
  public get EncryptedFS(): EncryptedFS {
    return this.efs;
  }

  /**
   * Determines whether a secret exists in the vault
   * @param secretName Name of desired secret
   */
  secretExists(secretName: string): boolean {
    const secretPath = Path.join(this.vaultPath, secretName);
    return this.secrets.has(secretName) && this.efs.existsSync(secretPath);
  }

  /**
   * Adds a secret to the vault
   * @param secretName Name of new secret
   * @param secret Content of new secret
   */
  async addSecret(secretName: string, secret: Buffer): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      // Check if secret already exists
      if (this.secrets.has(secretName)) {
        throw Error('Secret already exists, try updating it instead.');
      }
      const writePath = Path.join(this.vaultPath, secretName);
      // Write secret
      await this.efs.promises.writeFile(writePath, secret, {});
      // Update secrets map
      this.secrets.set(secretName, secret);
      // Auto commit message
      await this.commitChanges(`Add secret: ${secretName}`, secretName, 'added');
    } catch (error) {
      release();
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Updates a secret in the vault
   * @param secretName Name of secret to be updated
   * @param secret Content of updated secret
   */
  async updateSecret(secretName: string, secret: Buffer): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      // Check if secret already exists
      if (!this.secrets.has(secretName)) {
        throw Error('Secret does not exist, try adding it instead.');
      }
      const writePath = Path.join(this.vaultPath, secretName);
      // Write secret
      await this.efs.promises.writeFile(writePath, secret, {});
      // Update secrets map
      this.secrets.set(secretName, secret);
      // Auto commit message
      await this.commitChanges(`Update secret: ${secretName}`, secretName, 'modified');
    } catch (error) {
      release();
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Get a secret from the vault
   * @param secretName Name of secret to be retrieved
   */
  getSecret(secretName: string): Buffer | string {
    if (this.secrets.has(secretName)) {
      const secret = this.secrets.get(secretName);
      if (secret) {
        return secret;
      } else {
        const secretPath = Path.join(this.vaultPath, secretName);
        // TODO: this should be async
        const secretBuf = this.efs.readFileSync(secretPath, {});
        this.secrets.set(secretName, secretBuf);
        return secretBuf;
      }
    }
    throw Error('Secret: ' + secretName + ' does not exist');
  }

  /**
   * [WARNING] Removes a secret from the vault
   * @param secretName Name of secret to be removed
   */
  async removeSecret(secretName: string): Promise<void> {
    const release = await this.mutex.acquire();
    try {
      if (this.secrets.has(secretName)) {
        const successful = this.secrets.delete(secretName);
        // Remove from fs
        await this.efs.promises.unlink(Path.join(this.vaultPath, secretName));
        // Auto commit message
        await this.commitChanges(`Remove secret: ${secretName}`, secretName, 'removed');

        if (successful) {
          return;
        }
        throw Error('Secret: ' + secretName + ' was not removed');
      }
      throw Error('Secret: ' + secretName + ' does not exist');
    } catch (error) {
      release();
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Lists all the secrets currently in the vault
   */
  listSecrets(): string[] {
    let secrets: string[] = Array.from(this.secrets.keys());
    return secrets;
  }

  tagVault() {}

  untagVault() {}

  /////////////
  // Sharing //
  /////////////
  /**
   * Allows a particular public key to access the vault
   * @param publicKey Public key to share with
   */
  shareVault(publicKey: string) {
    if (this.sharedPubKeys.has(name)) {
      throw Error('Vault is already shared with given public key');
    }

    this.sharedPubKeys.add(publicKey);

    // Write metadata
    this.writeMetadata();
  }

  /**
   * Removes access to the vault for a particular public key
   * @param publicKey Public key to unshare with
   */
  unshareVault(publicKey: string) {
    if (!this.sharedPubKeys.has(publicKey)) {
      throw Error('Vault is not shared with given public key');
    }

    this.sharedPubKeys.delete(publicKey);

    // Write metadata
    this.writeMetadata();
  }

  /**
   * Determines if a particular public key can access the vault
   * @param publicKey Public key to check
   */
  peerCanAccess(publicKey: string): boolean {
    // return this.sharedPubKeys.has(publicKey)
    return true;
  }

  /**
   * Pulls the vault from a specific address
   * @param address Address of polykey node that owns vault to be pulled
   * @param getSocket Function to get an active connection to provided address
   */
  async pullVault(gitClient: GitClient) {
    const release = await this.mutex.acquire();
    try {
      // Strangely enough this is needed for pulls along with ref set to 'HEAD'
      // In isogit's documentation, this is just to get the currentBranch name
      // But it solves a bug whereby if not used, git.pull complains that it can't
      // find the master branch or HEAD
      await git.currentBranch({
        fs: { promises: this.efs.promises },
        dir: this.vaultPath,
        fullname: true,
      });
      // First pull
      await git.pull({
        fs: { promises: this.efs.promises },
        http: gitClient,
        dir: this.vaultPath,
        url: 'http://' + '0.0.0.0:0' + '/' + this.name,
        ref: 'HEAD',
        singleBranch: true,
        author: {
          name: this.name,
        },
      });

      // Load any new secrets
      this.loadSecrets();
    } catch (error) {
      release();
      throw error;
    } finally {
      release();
    }
  }

  async getVaultHistory(depth?: number) {
    const logs = await git.log({
      fs: { promises: this.efs.promises },
      dir: this.vaultPath,
      depth,
    });
    return logs.map((commit) => {
      return commit.commit.message;
    });
  }

  // ============== Helper methods ============== //
  private writeMetadata(): void {
    // mkdir first
    this.efs.mkdirSync(Path.dirname(this.metadataPath), { recursive: true });

    // Create and write metadata
    const metadata: VaultMetadata = {
      sharedPubKeys: Array.from(this.sharedPubKeys.keys()),
    };
    this.efs.writeFileSync(this.metadataPath, JSON.stringify(metadata));
  }

  private loadMetadata(): void {
    if (this.efs.existsSync(this.metadataPath)) {
      const fileContents = this.efs.readFileSync(this.metadataPath).toString();
      const metadata: VaultMetadata = JSON.parse(fileContents);
      this.sharedPubKeys = new Set(metadata.sharedPubKeys);
    } else {
      // Need to create it
      this.sharedPubKeys = new Set();
      this.writeMetadata();
    }
  }

  private async commitChanges(
    message: string,
    secretName: string,
    action: 'added' | 'modified' | 'removed',
  ): Promise<string> {
    if (action == 'removed') {
      await git.remove({
        fs: { promises: this.efs.promises },
        dir: this.vaultPath,
        filepath: secretName,
      });
    } else {
      await git.add({
        fs: { promises: this.efs.promises },
        dir: this.vaultPath,
        filepath: secretName,
      });
    }

    return await git.commit({
      fs: { promises: this.efs.promises },
      dir: this.vaultPath,
      author: {
        name: this.name,
      },
      message: message,
    });
  }

  private loadSecrets(): void {
    const secrets = fs.readdirSync(this.vaultPath, undefined);
    // Remove all secrets first
    this.secrets.clear();
    // Load secrets
    for (const secret of secrets.filter((s) => s[0] != '.')) {
      this.secrets.set(secret, null);
    }
  }
}

export default Vault;
