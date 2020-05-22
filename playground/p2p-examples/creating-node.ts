import PolykeyNode from '../../src/p2p/PolykeyNode'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import PeerInfo from '../../src/p2p/PeerStore/PeerInfo'


async function main() {
  const peerId = await PeerId.create()
  const node = new PolykeyNode(peerId)

  node.peerInfo.multiaddrs.add(new Multiaddr('/ip4/0.0.0.0/tcp/0'))

  await node.start()

  console.log('node started');

  console.log('node.peerInfo');
  console.log(node.peerInfo);

}

main()
