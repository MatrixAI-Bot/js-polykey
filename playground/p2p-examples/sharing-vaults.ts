import Polykey from '../../src'
import PeerId from 'peer-id'
import { KeyManager } from '../../src/KeyManager'

const createNode = async (homeDir: string) => {
  const peerId = await PeerId.create()
  const keyManager = new KeyManager(homeDir)
  // Generate a new identity
  const keyPair = await keyManager.generateKeyPair(
    `someidentity@${homeDir}`,
    `someidentity@${homeDir}.com.au`,
    `some really strong passphrase@${homeDir}`
  )

  const pk = new Polykey(
    Buffer.from(keyPair.public),
    Buffer.from(keyPair.private),
    keyManager,
    undefined,
    homeDir,
    peerId
  )

  const addr = await pk.start()
  console.log(addr);

  return pk
}

async function main() {
  const pk1 = await createNode('./tmp/Polykey1')
  // const pk2 = await createNode('./tmp/Polykey2')

  const pk1Vault = await pk1.createVault('Pk1Vault')
  // pk1.shareVault(pk1Vault.name)
}

main()





