// ts imports
import fs from 'fs'
import os from 'os'
import process from 'process'
import EncryptedFS from '../encryptedfs-tmp/EncryptedFS'
import Polykey from '../src/Polykey'
import Library from '../src/Polykey'

// js imports
const vfs = require('virtualfs')

function randomString(): string {
	return Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 5)
}

describe('PolyKey class', () => {

	let tempDir: string
    let pk: Polykey

	beforeAll(done => {
		// Define temp directory
		tempDir = fs.mkdtempSync(`${os.tmpdir}/pktest${randomString()}`)
		console.log(tempDir);
		
		// Create keyManager
		const km = new Polykey.KeyManager()
		km.loadKeyPair('./playground/keys/private.key', './playground/keys/public.key')
		// Initialize polykey
		pk = new Polykey(
			km,
			Buffer.from('some passphrase'),
			32,
			tempDir
		)
		done()
	})

	afterAll(() => {
		// fs.rmdirSync(`${tempDir}`)
	})

	////////////
	// Vaults //
	////////////
	describe('vaults', () => {
		let vaultName: string

		beforeEach(() => {
			// Reset the vault name for each test
			vaultName = `Vault-${randomString()}`
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
			expect(await pk.vaultExists(vaultName)).toStrictEqual(true)
			// Destroy the vault
			await pk.destroyVault(vaultName)
			expect(await pk.vaultExists(vaultName)).toStrictEqual(false)
		})

		///////////////////
		// Vault Secrets //
		///////////////////
		describe('secrets within vaults', () => {
			test('can create secrets and read them back', async () => {
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
			})
		})
	})

	test('can create keypairs', done => {
		// Create private keys (async)
		pk._km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
			fs.mkdirSync(`${tempDir}/keys/`, {recursive: true})
			fs.writeFileSync(`${tempDir}/keys/private.key`, keypair.private)
			fs.writeFileSync(`${tempDir}/keys/public.key`, keypair.public)
			done()
		})
	}, 20000)

	/////////////
	// Signing //
	/////////////
	describe('signing', () => {
		let vaultName: string

		beforeEach(done => {
			// Reset the vault name for each test
			vaultName = `Vault-${randomString()}`
			// Create private keys (async)
			pk._km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase').then((keypair) => {
				console.log(`keypair: ${keypair}`)
				console.log(keypair)
				done()
			})
		}, 200000)

		test('can sign and verify strings', async done => {
			const originalData = Buffer.from('I am to be signed')
			const signedData = await pk._km.signData(originalData)

			console.log(`signedData`)
			console.log(signedData)
			console.log(signedData.toString('utf8'))
			
			// // Verify
			// const verifiedData = await pk._km.verifyData(signedData)

			// console.log(verifiedData)
			

			done()
			
		}, 200000)
	})
	

	////////////////
	// KeyManager //
	////////////////

})

