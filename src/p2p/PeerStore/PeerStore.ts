import { EventEmitter } from 'events'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'
import PeerInfo from './PeerInfo'

/**
 * Responsible for managing known peers, as well as their addresses and metadata
 * @fires PeerStore#peer Emitted when a peer is connected to this node
 * @fires PeerStore#change:protocols
 * @fires PeerStore#change:multiaddrs
 */
class PeerStore extends EventEmitter {
  peers: Map<PeerId, PeerInfo>
  constructor () {
    super()

    this.peers = new Map()
  }

  /**
   * Stores the peerInfo of a new peer.
   * If already exist, its info is updated. If `silent` is set to
   * true, no 'peer' event will be emitted. This can be useful if you
   * are already in the process of dialing the peer. The peer is technically
   * known, but may not have been added to the PeerStore yet.
   * @param {PeerInfo} peerInfo
   * @param {object} [options]
   * @param {boolean} [options.silent] (Default=false)
   * @return {PeerInfo}
   */
  put(peerInfo: PeerInfo, silent: boolean = false): PeerInfo {
    let peer: PeerInfo
    // Already know the peer?
    if (this.has(peerInfo.id)) {
      peer = this.update(peerInfo)
    } else {
      peer = this.add(peerInfo)

      // Emit the peer if silent = false
      !silent && this.emit('peer', peerInfo)
    }
    return peer
  }

  /**
   * Add a new peer to the store.
   * @param {PeerInfo} peerInfo
   * @return {PeerInfo}
   */
  add(peerInfo: PeerInfo): PeerInfo {
    // Create new instance and add values to it
    const newPeerInfo = new PeerInfo(peerInfo.id)

    peerInfo.multiaddrs.forEach((ma) => newPeerInfo.multiaddrs.add(ma))
    peerInfo.protocols.forEach((p) => newPeerInfo.protocols.add(p))

    const connectedMa = peerInfo.connectedMultiaddr
    if (connectedMa) {
      newPeerInfo.connect(connectedMa)
    }

    const peerProxy = new Proxy(newPeerInfo, {
      set: (obj, prop, value) => {
        if (prop === 'multiaddrs') {
          this.emit('change:multiaddrs', {
            peerInfo: obj,
            multiaddrs: value.toArray()
          })
        } else if (prop === 'protocols') {
          this.emit('change:protocols', {
            peerInfo: obj,
            protocols: Array.from(value)
          })
        }
        return Reflect.set(obj, prop, value)
      }
    })

    this.peers.set(peerInfo.id, peerProxy)
    return peerProxy
  }

  /**
   * Updates an already known peer.
   * @param {PeerInfo} peerInfo
   * @return {PeerInfo}
   */
  update(peerInfo: PeerInfo): PeerInfo {
    const recorded = this.peers.get(peerInfo.id)
    if (!recorded) {
      return peerInfo
    }

    // pass active connection state
    const ma = peerInfo.connectedMultiaddr
    if (ma) {
      recorded.connect(ma)
    }

    // Verify new multiaddrs
    // TODO: better track added and removed multiaddrs
    const multiaddrsIntersection = [
      ...recorded.multiaddrs
    ].filter((m) => peerInfo.multiaddrs.has(m))

    if (multiaddrsIntersection.length !== peerInfo.multiaddrs.size ||
      multiaddrsIntersection.length !== recorded.multiaddrs.size) {
      for (const ma of peerInfo.multiaddrs) {
        recorded.multiaddrs.add(ma)
      }

      this.emit('change:multiaddrs', {
        peerInfo: recorded,
        multiaddrs: Array.from(recorded.multiaddrs)
      })
    }

    // Update protocols
    // TODO: better track added and removed protocols
    const protocolsIntersection = new Set(
      [...recorded.protocols].filter((p) => peerInfo.protocols.has(p))
    )

    if (protocolsIntersection.size !== peerInfo.protocols.size ||
      protocolsIntersection.size !== recorded.protocols.size) {
      for (const protocol of peerInfo.protocols) {
        recorded.protocols.add(protocol)
      }

      this.emit('change:protocols', {
        peerInfo: recorded,
        protocols: Array.from(recorded.protocols)
      })
    }

    // Add the public key if missing
    if (!recorded.id.pubKey && peerInfo.id.pubKey) {
      recorded.id.pubKey = peerInfo.id.pubKey
    }

    return recorded
  }

  /**
   * Get the info to the given id.
   * @param {PeerId|string} peerId b58str id
   * @returns {PeerInfo}
   */
  get(peerId: PeerId): PeerInfo | null {
    return this.peers.get(peerId) ?? null
  }

  /**
   * Has the info to the given id.
   * @param {PeerId|string} peerId b58str id
   * @returns {boolean}
   */
  has(peerId: PeerId): boolean {
    return this.peers.has(peerId)
  }

  /**
   * Completely replaces the existing peers metadata with the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @returns {void}
   */
  replace(peerInfo: PeerInfo): void {
    this.peers.delete(peerInfo.id)
    this.add(peerInfo)

    // This should be cleaned up in PeerStore v2
    this.emit('change:multiaddrs', {
      peerInfo,
      multiaddrs: peerInfo.multiaddrs
    })
  }

  /**
   * Returns the known multiaddrs for a given `PeerInfo`. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * @param {PeerInfo} peer
   * @returns {Array<Multiaddr>}
   */
  multiaddrsForPeer(peer: PeerInfo): Multiaddr[] {
    return Array.from(this.put(peer, true).multiaddrs).map(addr => {
      const idString = addr.getPeerId()
      if (idString && idString === peer.id.toB58String()) return addr
      return addr.encapsulate(`/p2p/${peer.id.toB58String()}`)
    })
  }
}

export default PeerStore
