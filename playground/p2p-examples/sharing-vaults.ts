import Polykey from '../../src'
import PeerId from 'peer-id'
import { KeyManager } from '../../src/KeyManager'

const createNode = async (homeDir: string) => {
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
    homeDir
  )

  const addr = await pk.start()
  console.log(addr);

  return pk
}

async function main() {
  console.log('============== Create PK1 ==============');
  const pk1 = await createNode('./tmp/Polykey1')
  console.log('============== Create PK1 ==============');
  const pk2 = await createNode('./tmp/Polykey2')

  // Create secure vault in pk1
  // first remove if exists
  pk1.destroyVault('SecureVault')
  const secureVault = await pk1.createVault('SecureVault')
  secureVault.addSecret('SomeSecret', Buffer.from('this is really secret'))

  // Clone into pk2
  // First have to 'discover' pk1
  await pk2.findPeer(pk1.polykeyNode.peerStore.peerInfo.publicKey)
  pk2.cloneVault(pk1.polykeyNode.peerStore.peerInfo.publicKey, secureVault.name)

  // Add another secret to pk1 vault and then pull from pk2
  secureVault.addSecret('someothersecret', Buffer.from('very secret'))
  await pk2.pullVault(pk1.polykeyNode.peerStore.peerInfo.publicKey, secureVault.name)

}

main()





