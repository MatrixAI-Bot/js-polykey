 
import * as openpgp from 'openpgp'
// var openpgp = require('openpgp')
import KeyManager from '../src/KeyManager'
import Cryptor from '../encryptedfs-tmp/Cryptor'
import debugLogger from 'debug'
import crypto from 'crypto'
import fs from 'fs-extra'

openpgp.initWorker({ path:'openpgp.worker.js' }) // set the relative web worker path
const debug = debugLogger('pgptest');
const pgp = openpgp

async function main() {
    const km = new KeyManager()
    const cryptor = new Cryptor('some password')

    // const keypair = await km.generateKeyPair('Aash', 'aash@win.com', 'strong password')
    const origtext = 'hey look this is some data'

    // read keys from disk
    const priv = await fs.readFile('keys/private.key')
    const pub = await fs.readFile('keys/public.key')

    // load key pair
    const keypair = { private: priv.toString(), public: pub.toString() }
    await cryptor.loadKeyPair(keypair.private, keypair.public, 'password')

    // ciphering
    const ciphertext = await cryptor.publicEncrypt(origtext)
    const plaintext = await cryptor.privateDecrypt(ciphertext)

    // sign/verify
    const signedtext = await cryptor.signData(plaintext);
    const valid = await cryptor.verifyData(signedtext)

    // file verify
    const signedFile =  await fs.readFile('../polykey-cli/src/signed.txt')
    const fileValid = await cryptor.verifyData(signedFile)

    console.log(plaintext === origtext)

    console.log('Data is verified: ' + valid)
}


/* var options = {
    userIds: [{ name:'Jon Smith', email:'jon@example.com' }], // multiple user IDs
    numBits: 4096,                                            // RSA key size
    passphrase: 'super long and hard to guess secret'         // protects the private key
};
debug('starting key gen')
openpgp.generateKey(options).then(function(key) {
    debug('finished key gen')
    var privkey = key.privateKeyArmored; // '-----BEGIN PGP PRIVATE KEY BLOCK ... '
    var pubkey = key.publicKeyArmored;   // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
    var revocationCertificate = key.revocationCertificate; // '-----BEGIN PGP PUBLIC KEY BLOCK ... '
}); */

/* async function main() {
    const privKeyBuf = await fs.readFileSync('keys/private.key')
    console.log(openpgp)
    console.log(openpgp.key)
    const privKey = (await openpgp.key.readArmored(privKeyBuf)).keys[0]
    console.log('Lets just take up a line')
} */



/* const encryptDecryptFunction = async() => {
    const privkey = await fs.readFile('keys/private.key')
    const pubkey = await fs.readFile('keys/public.key')
    const passphrase = 'password'
    const privKeyObj = (await openpgp.key.readArmored(privkey)).keys[0]
    await privKeyObj.decrypt(passphrase)
    const options = {
        message: openpgp.message.fromText('Hello, World!'),       // input as Message object
        publicKeys: (await openpgp.key.readArmored(pubkey)).keys, // for encryption
        privateKeys: [privKeyObj]                                 // for signing (optional)
    }
    openpgp.encrypt(options).then((ciphertext: any) => {
        const encrypted = ciphertext.data // '-----BEGIN PGP MESSAGE ... END PGP MESSAGE-----'
        return encrypted
    })
    .then(async encrypted => {
        const options = {
            message: await openpgp.message.readArmored(encrypted),    // parse armored message
            publicKeys: (await openpgp.key.readArmored(pubkey)).keys, // for verification (optional)
            privateKeys: [privKeyObj]                                 // for decryption
        }
        openpgp.decrypt(options).then(plaintext => {
            console.log(plaintext.data)
            return plaintext.data // 'Hello, World!'
        })
    })
}
encryptDecryptFunction() */

main().then(() => {
    console.log('end of program')
})