import Vault from "@polykey/Vault";
import PeerId = require("peer-id");

class VaultStore {
  private vaults:Map<string, Vault>
  private vaultShareMap:Map<string, Set<PeerId>>
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
    return this.vaults.delete(name)
  }
  public getVaultNames(): string[] {
    return Array.from(this.vaults.keys())
  }

  // Here is where we keep track of vault sharing
  public shareVault(name: string, peerId: PeerId) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()
    this.vaultShareMap.set(name, sharingPeers.add(peerId))
  }

  // Here is where we keep track of vault sharing
  public unshareVault(name: string, peerId: PeerId) {
    if (!this.hasVault(name)) {
      throw(new Error('Vault does not exist in store'))
    }
    const sharingPeers = this.vaultShareMap.get(name) ?? new Set()

    if (!sharingPeers.delete(peerId)) {
      throw(new Error('Vault could not be unshared from user.'))
    }
    this.vaultShareMap.set(name, sharingPeers)
  }
}

export default VaultStore
