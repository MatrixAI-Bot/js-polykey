import Polykey from '../src/Polykey'
import { Buffer } from 'buffer/'
import fs from 'fs-extra'
import chalk from 'chalk'
import os from 'os'
const delay = require('delay')

const kbpgp = require('kbpgp')

const main = async function() {
    const vaultName = 'VaultYouPutInHere?'
    const km = new Polykey.KeyManager()
    // const key = await km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase')
    // fs.mkdirSync('./playground/keys/', {recursive: true})
    // fs.writeFileSync('./playground/keys/private.key', key.private)
    // fs.writeFileSync('./playground/keys/public.key', key.public)
    
    const polykey1 = new Polykey(Buffer.from('somestrongsecret239f8j298nf23092428iun'), km)

    await polykey1.importKeyPair('./playground/keys/private.key', './playground/keys/public.key', 'passphrase')

    // const signedPath = await polykey.signFile('./playground/file')
    // console.log(chalk.green(`file signed at: ${signedPath}`))

    // // Verify
    // const verifiedPath = './playground/file.verified'
    // await polykey.verifyFile(signedPath, verifiedPath)
    // console.log(chalk.green(`file verified at: ${verifiedPath}`))

    

    await polykey1.startNode()






    const nodeAddr1 = (await polykey1.getNodeAddrs())[0]
  
    console.log('polykey node listening on:')
    console.log(nodeAddr1)
    


    const polykey2 = new Polykey(Buffer.from('qwertyuiop'), undefined, undefined, `${os.homedir()}/polykey2`)
    await polykey2.startNode([nodeAddr1])

    const nodeAddr2 = (await polykey2.getNodeAddrs())[0]
    console.log('polykey2 node listening on:')
    console.log(nodeAddr2)
    await polykey2.pingNode(nodeAddr2)
    
    await polykey1.stopNode()

    await polykey2.tcpNode()


    // // create vault
    // const vaultExists = await polykey.vaultExists(vaultName)
    //     .catch(err => console.error('Error checking vault existence', err.message))

    // if (!vaultExists) {
    //     await polykey.createVault(vaultName)
    //         .catch(e => console.error('Error while creating Vault', e.message))
    // }

    // // add secret
    // await polykey.addSecret(vaultName, 'ASecret', Buffer.from('super confidential information'))
    //     .catch(e => console.error('Error addding secret', e.message))

    // const secret = await polykey.getSecret(vaultName, 'ASecret')
    //     .catch(e => console.error('Error getting secret', e.message))

    // if (secret) {
    //     console.log(secret.toString())
    // }
}


main()