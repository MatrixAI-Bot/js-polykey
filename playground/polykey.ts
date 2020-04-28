import Polykey from '../src/Polykey'
import fs from 'fs';

const main = async function() {
    const vaultName = 'VaultYouPutInHere?'
    const km = new Polykey.KeyManager()
    const key = await km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase')
    fs.mkdirSync('./playground/keys/', {recursive: true})
    fs.writeFileSync('./playground/keys/private.key', key.private)
    fs.writeFileSync('./playground/keys/public.key', key.public)

    
    km.loadKeyPair('./playground/keys/private.key', './playground/keys/public.key')
    const polykey = new Polykey(km)

    // create vault
    const vaultExists = await polykey.vaultExists(vaultName)
        .catch(err => console.error('Error checking vault existence', err.message))

    if (!vaultExists) {
        await polykey.createVault(vaultName)
            .catch(e => console.error('Error while creating Vault', e.message))
    }

    // add secret
    await polykey.addSecret(vaultName, 'ASecret', Buffer.from('super confidential information'))
        .catch(e => console.error('Error addding secret', e.message))

    const secret = await polykey.getSecret(vaultName, 'ASecret')
        .catch(e => console.error('Error getting secret', e.message))

    if (secret) {
        console.log(secret.toString())
    }
}


main()