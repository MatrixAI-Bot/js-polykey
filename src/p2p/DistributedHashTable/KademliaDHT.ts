import { EventEmitter } from "events";
import Dialer from "../Dialer/Dialer";
import PeerId from "peer-id"
import PeerInfo from "../PeerStore/PeerInfo";
import RoutingTable from "./RoutingTable";
import PeerStore from "../PeerStore/PeerStore";

class KademliaDHT extends EventEmitter {

  peerId: PeerId
  dialer: Dialer
  routingTable: RoutingTable
  peerStore: PeerStore

  constructor(
    peerId: PeerId,
    dialer: Dialer,
    peerStore: PeerStore
  ) {
    super()

    this.peerId = peerId
    this.dialer = dialer
    this.routingTable = new RoutingTable(this.peerId)
    this.peerStore = peerStore
  }

  async findLocalPeer(peerId: PeerId): Promise<PeerInfo | null> {
    const foundPeerId = await this.routingTable.find(peerId)
    const foundPeerInfo = foundPeerId && this.peerStore.get(peerId)
    if (foundPeerInfo) {
      // Found local peer
      return foundPeerInfo
    } else {
      // Either can't find peerId in routing table or
      // PeerInfo doesn't exist in store. Either way,
      // we just return null
      return null
    }
  }

  // This function either returns the peer info from
  // a locally found peer or uses the FIND_NODE protocol
  // from kademlia to query peers until it finds the one
  // its looking for
  async findPeer(peerId: PeerId): Promise<PeerInfo | null> {
    // Return local peer if it exists in routing table
    const localPeerInfo = await this.findLocalPeer(peerId)
    if (localPeerInfo) {
      return localPeerInfo
    }

    // If local peer was not found, get closest peers and
    // start querying the network
    const kBucketSize = this.routingTable.kBucket.numberOfNodesPerKBucket
    const closestPeers = await this.routingTable.closestPeers(peerId, kBucketSize)

    // If there are no closest peers, we have failed to find that peer
    if (closestPeers.length === 0) {
      throw(new Error('Peer lookup failed'))
    }

    // Check if peerId is in closest peer and return if found
    const match = closestPeers.find((p) => p.isEqual(peerId))
    if (match) {
      const peerInfo = this.peerStore.get(peerId)
      if (peerInfo) {
        return peerInfo
      }
    }

    // Query the network until the peer id is found
    for (const closePeerId of closestPeers) {
      const closePeerInfo = this.peerStore.get(closePeerId)
      if (closePeerInfo) {
        const conn = await this.dialer.connectToPeer(closePeerInfo)
        conn

      }
    }
    return null


  }
}

export default KademliaDHT
