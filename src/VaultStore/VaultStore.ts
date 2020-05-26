import Vault from "@polykey/Vault";

class VaultStore {
  private vaults:Map<string, Vault>
  constructor() {
    this.vaults = new Map()
  }


  public set(name: string, vault: Vault) {
    this.vaults.set(name, vault)
  }
  public get(name: string): Vault | undefined {
    return this.vaults.get(name)
  }
  public has(name: string): boolean {
    return this.vaults.has(name)
  }
  public delete(name: string): boolean {
    return this.vaults.delete(name)
  }


  public getVaultNames(): string[] {
    return Array.from(this.vaults.keys())
  }

}

export default VaultStore
