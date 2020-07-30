import fs, { write } from 'fs';
import os from 'os';
import path from 'path';
import Polykey from "../../../src/lib/Polykey";
import { randomString } from '../../../src/lib/utils';
import KeyManager from '../../../src/lib/keys/KeyManager';
import VaultManager from '../../../src/lib/vaults/VaultManager';
import crypto from 'crypto';

describe('VaultManager class', () => {
  let randomVaultName: string

  let tempDir: string
  let pk: Polykey
  let vm: VaultManager

  beforeAll(async done => {
    // Define temp directory
    tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)

    // Create keyManager
    const km = new KeyManager(tempDir, fs)

    // Generate keypair
    await km.generateKeyPair('John Smith', 'john.smith@email.com', 'passphrase', 1024, true)

    // Load pki info
    const cwd = process.cwd()
    const peer1Path = path.join(cwd, 'tmp', 'secrets', 'peer1')
    const caPath = path.join(cwd, 'tmp', 'secrets', 'CA')
    km.loadPKIInfo(
      fs.readFileSync(path.join(peer1Path, 'server.key')),
      fs.readFileSync(path.join(peer1Path, 'server.crt')),
      fs.readFileSync(path.join(caPath, 'root_ca.crt')),
      true
    )

    // Initialize polykey
    pk = new Polykey(
      tempDir,
      fs,
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
      const km2 = new KeyManager(tempDir2, fs)

      // Generate keypair
      await km2.generateKeyPair('Jane Doe', 'jane.doe@email.com', 'passphrase', 1024, true)

      // Load pki info
      const cwd = process.cwd()
      const peer2Path = path.join(cwd, 'tmp', 'secrets', 'peer2')
      const caPath = path.join(cwd, 'tmp', 'secrets', 'CA')
      km2.loadPKIInfo(
        fs.readFileSync(path.join(peer2Path, 'server.key')),
        fs.readFileSync(path.join(peer2Path, 'server.crt')),
        fs.readFileSync(path.join(caPath, 'root_ca.crt')),
        true
      )

      // Initialize polykey
      peerPk = new Polykey(
        tempDir2,
        fs,
        km2
      )
      peerVm = peerPk.vaultManager
      done()
    })

    afterAll(() => {
      // Remove temp directory
      fs.rmdirSync(tempDir2, { recursive: true })
    })

    test('can clone vault', async done => {
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

      expect(peerPkSecret).toStrictEqual(pkSecret)
      expect(peerPkSecret).toStrictEqual(initialSecret)


      done()
    })

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

    test('removing secret is reflected in peer vault', async done => {
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

  /////////////////
  // Concurrency //
  /////////////////
  describe('concurrency', () => {
    test('parallel write operations are sequentially executed', async done => {
      const vault = await pk.vaultManager.createVault(randomVaultName)
      const writeOps: Promise<void>[] = []
      const expectedHistory: number[] = []
      for (const n of Array(50).keys()) {
        // Get a random number of bytes so each operation might finish earlier than the others
        const randomNumber = 1 + Math.round(Math.random() * 5000)
        const secretBuffer = crypto.randomBytes(randomNumber)
        const writeOp = vault.addSecret(`${n + 1}`, secretBuffer)
        writeOps.push(writeOp)
        expectedHistory.push(n + 1)
      }
      await Promise.all(writeOps)

      const history = (await vault.getVaultHistory()).reverse()
        .map((commit) => {
          const match = commit.match(/([0-9]+)/)
          return (match) ? parseInt(match[0]) : undefined
        })
        .filter((n) => n != undefined)

      expect(history).toEqual(expectedHistory)

      done()
    }, 20000)
  })
})
