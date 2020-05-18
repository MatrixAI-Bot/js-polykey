import multihashing from 'multihashing-async'
import PeerId from 'peer-id'
import { KBucket, PeerContact } from './kBucket'

async function peerIdToHash(peerInfo: PeerId): Promise<Buffer> {
  return await multihashing.digest(peerInfo.id, 'sha2-256')
}

export class DistributedHashTable {
  private kBucket: KBucket

  constructor(peerId: PeerId) {
    peerIdToHash(peerId).then((localNodeId: Buffer) => {
      this.kBucket = new KBucket({ localNodeId: localNodeId })

      this.kBucket.on('ping', (oldContacts: PeerContact[], newContact: PeerContact) => {
        // This ping function can be though of as a 'dumb' ping
        // Ideally it should contact the oldest contact first to see if
        // it still responds and if it does it keeps it.
        // This implementation ignores this and just replaces it blindly
        // with the new one
        // TODO: ping oldest
        // just use the first one (k-bucket sorts from oldest to newest)
        const oldest = oldContacts[0]

        // remove the oldest one
        this.kBucket.remove(oldest.id)

        // add the new one
        this.kBucket.add(newContact)
      })
    })
  }

  async find(peerId: PeerId): Promise<PeerId | null> {
    const key = await peerIdToHash(peerId)
    const closest = this.closestPeer(key)

    if (closest && closest.isEqual(peerId)) {
      return closest
    } else {
      return null
    }
  }

  closestPeer(key: Buffer): PeerId | null {
    const res = this.closestPeers(key, 1)
    if (res.length > 0) {
      return res[0]
    } else {
      return null
    }
  }
  closestPeers(key: Buffer, count: number): PeerId[] {
    return this.kBucket.closest(key, count).map((p: {id: Buffer, peer: PeerId}) => {
      return p.peer
    })
  }
  async add(peerId: PeerId) {
    const id = await peerIdToHash(peerId)

    return this.kBucket.add({ id: id, peer: peerId })
  }

  async remove(peerId: PeerId) {
    const id = await peerIdToHash(peerId)

    this.kBucket.remove(id)
  }
}

// async function main() {
//   // _determineNode(Buffer.from('something hahaha'), 5)

//   const peerId1 = await PeerId.create()

//   const routingTable = new DistributedHashTable(peerId1)

//   const peerId2 = await PeerId.create()

//   console.log('found')

//   await routingTable.add(peerId2)
//   const found = await routingTable.find(peerId2)
//   console.log(found === null)
//   console.log(found)

// }
// main()
