// import multihashing from 'multihashing-async'
// import PeerId from 'peer-id'
// import KBucket, { PeerContact } from './KBucket'
// import { EventEmitter } from 'events'

// async function peerIdToHash(peerInfo: PeerId): Promise<Uint8Array> {

//   return await multihashing.digest(peerInfo.id, 'sha2-256')
// }

// class RoutingTable extends EventEmitter {
//   kBucket: KBucket

//   constructor(peerId: PeerId) {
//     super()
//     peerIdToHash(peerId).then((localNodeId: Uint8Array) => {
//       this.kBucket = new KBucket({ localNodeId: localNodeId })

//       this.kBucket.on('ping', (oldContacts: PeerContact[], newContact: PeerContact) => {
//         // This ping function can be though of as a 'dumb' ping
//         // Ideally it should contact the oldest contact first to see if
//         // it still responds and if it does it keeps it.
//         // This implementation ignores this and just replaces it blindly
//         // with the new one
//         // TODO: ping oldest
//         // just use the first one (k-bucket sorts from oldest to newest)
//         const oldest = oldContacts[0]

//         // remove the oldest one
//         this.kBucket.remove(oldest.id)

//         // add the new one
//         this.kBucket.add(newContact)
//       })
//     })
//   }

//   async find(peerId: PeerId): Promise<PeerId | null> {
//     const closest = await this.closestPeer(peerId)

//     if (closest && closest.isEqual(peerId)) {
//       return closest
//     } else {
//       return null
//     }
//   }

//   async closestPeer(peerId: PeerId): Promise<PeerId | null> {
//     const res = await this.closestPeers(peerId, 1)
//     if (res.length > 0) {
//       return res[0]
//     } else {
//       return null
//     }
//   }
//   async closestPeers(peerId: PeerId, count: number): Promise<PeerId[]> {
//     const key = await peerIdToHash(peerId)

//     return this.kBucket.closest(key, count).map((p: {id: Uint8Array, peer: PeerId}) => {
//       return p.peer
//     })
//   }
//   async addPeer(peerId: PeerId) {
//     const id = await peerIdToHash(peerId)

//     return this.kBucket.add({ id: id, peer: peerId })
//   }
//   async addPeers(peerIds: PeerId[]) {

//     for (const peerId of peerIds) {
//       const id = await peerIdToHash(peerId)

//       return this.kBucket.add({ id: id, peer: peerId })
//     }
//   }

//   async remove(peerId: PeerId) {
//     const id = await peerIdToHash(peerId)

//     this.kBucket.remove(id)
//   }
// }

// export default RoutingTable
