import Polykey from '../../src/Polykey'
import PolykeyNode from '../../src/p2p/PolykeyNode'
import MulticastDNS from '../../src/p2p/mDNS/MulticastDNS'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import crypto from 'crypto'

const createNode = async () => {
  const peerId = await PeerId.create()
  const node = new PolykeyNode(peerId)

  node.peerStore.peerInfo.multiaddrs.add(new Multiaddr('/ip4/0.0.0.0/tcp/0'))

  await node.start()
  return node
}

async function main() {
  const peer1 = await createNode()
  const km1 = new Polykey.KeyManager()
  const keyPair1 = await km1.generateKeyPair('pubKey1', 'pubKey1@key.com', 'pubKey1 passphrase')


  const peer2 = await createNode()
  const km2 = new Polykey.KeyManager('~/.polykey2')
  const keyPair2 = await km2.generateKeyPair('pubKey2', 'pubKey2@key.com', 'pubKey2 passphrase')

  const message = Buffer.from('I am someones message')
  const encryptedMessage = await km1.encryptData(message, Buffer.from(keyPair2.public))

  const decryptedMessage = await km2.decryptData(encryptedMessage)
  console.log(message.toString());
  console.log(encryptedMessage);
  console.log(decryptedMessage.toString());


  const mDNS1 = new MulticastDNS(peer1.peerStore, km1)
  await mDNS1.start()

  const mDNS2 = new MulticastDNS(peer2.peerStore, km2)
  await mDNS2.start()
  mDNS2.requestPeerContact(Buffer.from(keyPair1.public), peer1.peerStore.peerInfo.id)



}

main()
