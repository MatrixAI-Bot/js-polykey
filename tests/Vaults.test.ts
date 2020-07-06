import fs from 'fs'
import os from 'os'
import {pki} from 'node-forge'
import Polykey from "@polykey/Polykey"
import { randomString } from '@polykey/utils'
import KeyManager from '@polykey/keys/KeyManager'
import VaultManager from '@polykey/vaults/VaultManager'
import PublicKeyInfrastructure from '@polykey/keys/pki/PublicKeyInfrastructure'

describe('vaults', () => {
  let randomVaultName: string

	let tempDir: string
  let pk: Polykey
  let vm: VaultManager
  let caCert: Buffer
  let caKey: Buffer

	beforeAll(async done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

		// Create keyManager
		const km = new KeyManager(tempDir)
    await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 128, true)
		// Initialize polykey
		pk = new Polykey(
			tempDir,
      km
    )
    vm = pk.vaultManager
		done()
	})

	afterAll(() => {
		fs.rmdirSync(`${tempDir}`)
	})

  beforeEach(() => {
    // Reset the vault name for each test
    randomVaultName = `Vault-${randomString()}`
  })

  test('can create vault', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
  })

  test('cannot create same vault twice', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    const vaultExists = vm.vaultExists(randomVaultName)
    expect(vaultExists).toEqual(true)
    // Create vault a second time
    expect(vm.createVault(randomVaultName)).rejects.toThrow('Vault already exists!')
  })
  test('can destroy vaults', async () => {
    // Create vault
    await vm.createVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(true)
    // Destroy the vault
    vm.destroyVault(randomVaultName)
    expect(vm.vaultExists(randomVaultName)).toStrictEqual(false)
  })

  ///////////////////
  // Vault Secrets //
  ///////////////////
  describe('secrets within vaults', () => {
    test('can create secrets and read them back', async () => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)

      // Run test
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      // Add secret
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Read secret
      const readBuffer = vault.getSecret(initialSecretName)
      const readSecret = readBuffer.toString()

      expect(readSecret).toStrictEqual(initialSecret)
    })
  })

  ////////////////////
  // Sharing Vaults //
  ////////////////////
  describe('sharing vaults', () => {
    let tempDir2: string
    let peerPk: Polykey
    let peerVm: VaultManager

    beforeAll(async done => {
      // Define temp directory
      tempDir2 = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
      // Create keyManager
      const km2 = new KeyManager(tempDir2)
      await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', 128, true)
      // PublicKeyInfrastructure
      const pki = new PublicKeyInfrastructure(caKey, caCert)

      // Initialize polykey
      peerPk = new Polykey(
        tempDir2,
        km2,
        undefined,
        undefined,
        pki
      )
      peerVm = peerPk.vaultManager
      done()
    })

    afterAll(() => {
      // Remove temp directory
      fs.rmdirSync(tempDir2, {recursive: true})
    })

    test('can share vault', async done => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'ASecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // Pull from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)

      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      const pkSecret = vault.getSecret(initialSecretName).toString()

      await clonedVault.pullVault(gitClient)

      const peerPkSecret = clonedVault.getSecret(initialSecretName).toString()
      console.log(pkSecret);
      console.log(peerPkSecret);


      expect(peerPkSecret).toStrictEqual(pkSecret)
      expect(peerPkSecret).toStrictEqual(initialSecret)


      done()
    },20000)

    test('can pull changes', async done => {
      // Create vault
      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)
      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      // Add secret to pk
      await vault.addSecret('NewSecret', Buffer.from('some other secret information'))

      // Pull from vault
      await clonedVault.pullVault(gitClient)

      // Compare new secret
      const pkNewSecret = vault.getSecret(initialSecretName).toString()
      const peerPkNewSecret = clonedVault.getSecret(initialSecretName).toString()
      expect(pkNewSecret).toStrictEqual(peerPkNewSecret)
      done()
    })

    test('removing secrets from shared vaults is reflected in peer vault', async done => {
      // Create vault

      const vault = await vm.createVault(randomVaultName)
      // Add secret
      const initialSecretName = 'InitialSecret'
      const initialSecret = 'super confidential information'
      await vault.addSecret(initialSecretName, Buffer.from(initialSecret))

      // First clone from pk in peerPk
      const gitClient = peerPk.peerManager.connectToPeer(pk.peerManager.getLocalPeerInfo().connectedAddr!)
      const clonedVault = await peerVm.cloneVault(randomVaultName, gitClient)

      // Confirm secrets list only contains InitialSecret
      const secretList = vault.listSecrets()
      const clonedSecretList = clonedVault.listSecrets()
      expect(secretList).toEqual(clonedSecretList)
      expect(clonedSecretList).toEqual([initialSecretName])

      // Remove secret from pk vault
      await vault.removeSecret(initialSecretName)

      // Pull clonedVault
      await clonedVault.pullVault(gitClient)

      // Confirm secrets list is now empty
      const removedSecretList = vault.listSecrets()
      const removedClonedSecretList = clonedVault.listSecrets()
      expect(removedSecretList).toEqual(removedClonedSecretList)
      expect(removedClonedSecretList).toEqual([])


      done()
    })
  })
})
