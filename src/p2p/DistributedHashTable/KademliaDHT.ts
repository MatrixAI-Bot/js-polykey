// import { EventEmitter } from "events";
// import Dialer from "../Dialer/Dialer";
// import PeerId from "peer-id"
// import PeerInfo from "../PeerStore/PeerInfo";
// import RoutingTable from "./RoutingTable";
// import PeerStore from "../PeerStore/PeerStore";
// import {RPCMessage} from "../RPC/RPCMessage";
// import pEvent from 'p-event'

// class KademliaDHT extends EventEmitter {

//   peerId: PeerInfo
//   dialer: Dialer
//   routingTable: RoutingTable
//   peerStore: PeerStore

//   private running: boolean

//   constructor(
//     peerId: PeerInfo,
//     dialer: Dialer,
//     peerStore: PeerStore
//   ) {
//     super()

//     this.peerId = peerId
//     this.dialer = dialer
//     this.routingTable = new RoutingTable(this.peerId.id)
//     this.peerStore = peerStore
//     this.running
//   }


//   /**
//    * Is this DHT running.
//    * @type {bool}
//    */
//   get isStarted () {
//     return this.running
//   }

//   /**
//    * Start listening to incoming connections.
//    * @returns {Promise<void>}
//    */
//   async start (): Promise<void> {
//     this.running = true

//     // // Start random walk, it will not run if it's disabled
//     // this.randomWalk.start()
//   }

//   async findLocalPeer(peerId: PeerId): Promise<PeerInfo | null> {
//     const foundPeerId = await this.routingTable.find(peerId)
//     const foundPeerInfo = foundPeerId && this.peerStore.get(peerId)
//     if (foundPeerInfo) {
//       // Found local peer
//       return foundPeerInfo
//     } else {
//       // Either can't find peerId in routing table or
//       // PeerInfo doesn't exist in store. Either way,
//       // we just return null
//       return null
//     }
//   }

//   // This function either returns the peer info from
//   // a locally found peer or uses the FIND_NODE protocol
//   // from kademlia to query peers until it finds the one
//   // its looking for
//   async findPeer(peerId: PeerId): Promise<PeerInfo | null> {
//     // Return local peer if it exists in routing table
//     const localPeerInfo = await this.findLocalPeer(peerId)
//     if (localPeerInfo) {
//       return localPeerInfo
//     }


//     // If local peer was not found, get closest peers and
//     // start querying the network

//     const kBucketSize = this.routingTable.kBucket.numberOfNodesPerKBucket
//     const closestPeers = await this.routingTable.closestPeers(peerId, kBucketSize)

//     // If there are no closest peers, we have failed to find that peer
//     if (closestPeers.length === 0) {
//       throw(new Error('Peer lookup failed'))
//     }

//     console.log('closestPeers');
//     console.log(closestPeers);

//     // Check if peerId is in closest peer and return if found
//     const match = closestPeers.find((p) => p.isEqual(peerId))
//     if (match) {
//       const peerInfo = this.peerStore.get(peerId)
//       if (peerInfo) {
//         return peerInfo
//       }
//     }

//     // Query the network until the peer id is found
//     for (const closePeerId of closestPeers) {
//       const closePeerInfo = this.peerStore.get(closePeerId)

//       if (closePeerInfo) {
//         const conn = await this.dialer.connectToPeer(closePeerInfo)

//         const findNodeRequest = RPCMessage.encodeFindNodeMessage(this.peerId, 20, [])

//         conn.write(findNodeRequest, (err) => {
//           if (err) {
//             console.log('there was an error when writing findNodeMessage');
//             console.log(err);
//             console.log('findNodeMessage');
//             console.log(findNodeRequest);
//           }
//         })

//         const data: Buffer = await pEvent(conn, 'data')

//         const { requestingPeerInfo, numClosestPeers, closestPeerInfoArray } = RPCMessage.decodeFindNodeMessage(data)

//         // Found peers!
//         console.log('Found some peers!');

//         // Add peers to routing table
//         const closestPeerIds = closestPeerInfoArray.map((p) => {return p.id})
//         await this.routingTable.addPeers(closestPeerIds)

//         // Get peer info if peerId exists in closestPeerIds
//         for (const id of closestPeerIds) {
//           if (peerId.toB58String() == id.toB58String()) {
//             const peerInfo = this.peerStore.get(id)
//             if (peerInfo) {
//               console.log('Peer was found!!');
//               return peerInfo
//             } else {
//               throw(Error('Peer id was found, but its info does not exist in peer store'))
//             }
//           }
//         }

//         return null
//       }
//     }
//     return null
//   }
// }

// export default KademliaDHT
