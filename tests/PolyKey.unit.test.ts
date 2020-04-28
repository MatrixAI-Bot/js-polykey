// ts imports
import fs from 'fs'
import os from 'os'
import process from 'process'
import EncryptedFS from '../encryptedfs-tmp/EncryptedFS'
import Polykey from '../src/Polykey'
import Library from '../src/Polykey'

// js imports
const vfs = require('virtualfs')

describe('PolyKey class', () => {
	let tempDir: string
    let pk: Polykey

	beforeEach(done => {
		// Create vfs and efs instances
		const vfsInstance = new vfs.VirtualFS
		const efsInstance = new EncryptedFS(
			'passkey',
			vfsInstance,
			vfsInstance,
			fs,
			process
		)
		// Define temp directory
		tempDir = efsInstance.mkdtempSync(`${os.tmpdir}/pktest`)
		// Create keyManager
		const km = new Polykey.KeyManager()
		km.loadKeyPair('./playground/keys/private.key', './playground/keys/public.key')
		// Initialize polykey
		pk = new Polykey(
			km,
			32,
			tempDir
		)
		// Create private keys (async)
		km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
			fs.mkdirSync(`${tempDir}/keys/`, {recursive: true})
			fs.writeFileSync(`${tempDir}/keys/private.key`, keypair.private)
			fs.writeFileSync(`${tempDir}/keys/public.key`, keypair.public)
			done()
		})
	})

	afterAll(() => {
		fs.rmdirSync(`${os.tmpdir}/pktest`)
	})

	////////////
	// Vaults //
	////////////
	describe('vaults', () => {
		let vaultName: string

		beforeEach(() => {
			// Reset the vault name for each test
			vaultName = `Vault-${Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)}`
		})
		
		test('can create vaults', async () => {
			// Create vault
			await pk.createVault(vaultName)
			const vaultExists = await pk.vaultExists(vaultName)
			expect(vaultExists).toEqual(true)
		})
		test('cannot create same vault twice', async () => {
			// Create vault
			await pk.createVault(vaultName)
			const vaultExists = await pk.vaultExists(vaultName)
			expect(vaultExists).toEqual(true)
			// Create vault a second time
			expect(pk.createVault(vaultName)).rejects.toThrow('Vault already exists!')
		})
		test('can destroy vaults', async () => {
			// Create vault
			await pk.createVault(vaultName)
			// Destroy the vault
			const vaultDestroyed = await pk.destroyVault(vaultName)
			expect(vaultDestroyed).toEqual(true)
		})


		describe('secrets within vaults', () => {
			test('can create secrets and read them back', async done => {
				// Create vault
				await pk.createVault(vaultName)
				
				// Run test
				const initialSecretName = 'ASecret'
				const initialSecret = 'super confidential information'
				// Add secret
				await pk.addSecret(vaultName, initialSecretName, Buffer.from(initialSecret))
				
				// Read secret
				const readBuffer = await pk.getSecret(vaultName, initialSecretName)
				const readSecret = readBuffer.toString()

				expect(readSecret).toStrictEqual(initialSecret)

				done()
			})
		})
	})

	/////////////
	// Signing //
	/////////////

})


