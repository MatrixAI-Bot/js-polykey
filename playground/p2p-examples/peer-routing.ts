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

  const [node1, node2, node3] = await Promise.all([
    createNode(),
    createNode(),
    createNode()
  ])

  console.log('node.peerInfo.multiaddrs');
  console.log(node2.peerInfo.multiaddrs);

  await Promise.all([
    node1.dial(node2.peerInfo),
    // node2.dial(node2.peerInfo),
  ])

  // The DHT routing tables need a moment to populate
  await new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve()
    }, 100)
  })
  console.log('DHT finished populating');



  // const peer: PeerInfo = await node1.findPeer(node3.peerInfo.id)

  // console.log('Found it, multiaddrs are:')
  // peer.multiaddrs.forEach((ma) => console.log(ma.toString()))
}

main()
