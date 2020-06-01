import Vault from "./Vault";

class VaultStore {
  private vaults:Map<string, Vault>
  private vaultShareMap:Map<string, Set<string>>
  constructor() {
    this.vaults = new Map()
    this.vaultShareMap = new Map()
  }

  // Here is where we keep track of vaults themselves
  public setVault(name: string, vault: Vault) {
    this.vaults.set(name, vault)
  }
  public getVault(name: string): Vault | undefined {
    return this.vaults.get(name)
  }
  public hasVault(name: string): boolean {
    return this.vaults.has(name)
  }
  public deleteVault(name: string): boolean {

    return this.vaults.delete(name) && this.vaultShareMap.delete(name)
  }
  public getVaultNames(): string[] {
    return Array.from(this.vaults.keys())
  }

  // Here is where we keep track of vault sharing
  public shareVault(name: string, publicKey: string) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()
    this.vaultShareMap.set(name, sharingPeers.add(publicKey))
  }

  // Here is where we keep track of vault sharing
  public unshareVault(name: string, publicKey: string) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()

    if (!sharingPeers.delete(publicKey)) {
      throw(new Error('Vault could not be unshared from user.'))
    }
    this.vaultShareMap.set(name, sharingPeers)
  }
}

export default VaultStore
