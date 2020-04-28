import Cryptor from '../encryptedfs-tmp/Cryptor'
import KeyManager from '../src/KeyManager'
import * as crypto from 'crypto'


const km = new KeyManager()
console.log(km)
km.generateKeyPair('Aash', 'aash@win.com', 'strong password').then((keypair) => {
    console.log('resolved')
    const priv = keypair['private']
    const pub = keypair['public']

    console.log(priv, pub)
}).catch((err) => {
    console.log('error')
    console.log(err)
})
console.log('begin test')
const test = crypto.randomBytes(12)