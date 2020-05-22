import PolykeyNode from '../../src/p2p/PolykeyNode'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import PeerInfo from '../../src/p2p/PeerStore/PeerInfo'


const createNode = async () => {
  const peerId = await PeerId.create()
  const node = new PolykeyNode(peerId)

  node.peerInfo.multiaddrs.add(new Multiaddr('/ip4/0.0.0.0/tcp/0'))

  await node.start()
  return node
}

async function main() {

  const node1 = await createNode()
  const node2 = await createNode()
  const node3 = await createNode()
  const node4 = await createNode()
  const node5 = await createNode()
  const node6 = await createNode()
  const node7 = await createNode()
  const node8 = await createNode()
  const node9 = await createNode()
  const node10 = await createNode()
  const node11 = await createNode()
  const node12 = await createNode()
  const node13 = await createNode()
  const node14 = await createNode()
  const node15 = await createNode()
  const node16 = await createNode()

  await Promise.all([
    node1.dial(node2.peerInfo),
    node2.dial(node3.peerInfo),
    node3.dial(node4.peerInfo),
    node4.dial(node5.peerInfo),
    node5.dial(node6.peerInfo),
    node6.dial(node7.peerInfo),
    node7.dial(node8.peerInfo),
    node8.dial(node9.peerInfo),
    node9.dial(node10.peerInfo),
    node10.dial(node11.peerInfo),
    node11.dial(node12.peerInfo),
    node12.dial(node13.peerInfo),
    node13.dial(node14.peerInfo),
    node14.dial(node15.peerInfo),
    node15.dial(node16.peerInfo)
  ])

  // The DHT routing tables need a moment to populate
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 100)
  })
  console.log('DHT finished populating');

  const peer = await node1.findPeer(node16.peerInfo.id)

  if (peer) {
    console.log('Found it, multiaddrs are:')
    peer.multiaddrs.forEach((ma) => console.log(ma.toString()))
  }
}

main()
