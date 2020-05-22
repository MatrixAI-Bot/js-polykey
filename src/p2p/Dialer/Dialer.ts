import PeerStore from "../PeerStore/PeerStore"
import DialRequest from "./DialRequest"
import Multiaddr from "multiaddr"
import PeerInfo from "../PeerStore/PeerInfo"
import PeerId = require("peer-id")
import TransportManager from "../Transport/TransportManager"
import net from 'net'


const DIAL_TIMEOUT = 30e3 // How long in ms a dial attempt is allowed to take
const MAX_PARALLEL_DIALS = 100 // Maximum allowed concurrent dials
const MAX_PER_PEER_DIALS = 4 // Allowed parallel dials per DialRequest

type PendingDial = {
  dialRequest: DialRequest,
  promise: Promise<net.Socket>,
  destroy: () => void
}

type DialTarget = {
  id: string,
  addrs: Multiaddr[]
}

export type Dialable = PeerInfo | Multiaddr

class Dialer {
  transportManager: TransportManager
  peerStore: PeerStore
  concurrency: number
  timeout: number
  perPeerLimit: number
  tokens: number[]
  pendingDials: Map<string, PendingDial>
  /**
   * @constructor
   * @param {object} options
   * @param {TransportManager} options.transportManager
   * @param {Peerstore} peerStore
   * @param {number} options.concurrency Number of max concurrent dials. Defaults to `MAX_PARALLEL_DIALS`
   * @param {number} options.timeout How long a dial attempt is allowed to take. Defaults to `DIAL_TIMEOUT`
   */
  constructor (
    transportManager: TransportManager,
    peerStore: PeerStore,
    concurrency = MAX_PARALLEL_DIALS,
    timeout = DIAL_TIMEOUT,
    perPeerLimit = MAX_PER_PEER_DIALS
  ) {
    this.transportManager = transportManager
    this.peerStore = peerStore
    this.concurrency = concurrency
    this.timeout = timeout
    this.perPeerLimit = perPeerLimit
    this.tokens = [...new Array(concurrency)].map((_, index) => index)
    this.pendingDials = new Map()
  }

  /**
   * Clears any pending dials
   */
  destroy () {
    // for (const dial of this.pendingDials.values()) {
    //   try {
    //     dial.controller.abort()
    //   } catch (err) {
    //     console.log(err)
    //   }
    // }
    this.pendingDials.clear()
  }

  /**
   * Connects to a given `PeerId` or `Multiaddr` by dialing all of its known addresses.
   * The dial to the first address that is successfully able to upgrade a connection
   * will be used.
   *
   * @param {PeerInfo|Multiaddr} peer The peer to dial
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {Promise<Connection>}
   */
  async connectToPeer(peer: PeerInfo, options: any = {}): Promise<net.Socket> {

    const dialTarget = this._createDialTarget(peer)
    console.log('peer');
    console.log(peer);

    console.log(peer);

    if (dialTarget.addrs.length === 0) {
      throw(new Error('The dial request has no addresses'))
    }
    const pendingDial = this.pendingDials.get(dialTarget.id) || this._createPendingDial(dialTarget, options)

    try {
      const connection = await pendingDial.promise
      console.log('dial succeeded to %s', dialTarget.id)
      return connection
    } catch (err) {
      throw err
    } finally {
      pendingDial.destroy()
    }
  }

  /**
   * @typedef DialTarget
   * @property {string} id
   * @property {Multiaddr[]} addrs
   */

  /**
   * Creates a DialTarget. The DialTarget is used to create and track
   * the DialRequest to a given peer.
   * @private
   * @param {PeerInfo|Multiaddr} peer A PeerId or Multiaddr
   * @returns {DialTarget}
   */
  _createDialTarget(peer: PeerInfo): DialTarget {
    const dialable = Dialer.getDialable(peer)
    if (Multiaddr.isMultiaddr(dialable)) {
      return {
        id: dialable.toString(),
        addrs: [dialable]
      }
    }
    const addrs = this.peerStore.multiaddrsForPeer(dialable)
    return {
      id: dialable.id.toB58String(),
      addrs
    }
  }

  /**
   * @typedef PendingDial
   * @property {DialRequest} dialRequest
   * @property {TimeoutController} controller
   * @property {Promise} promise
   * @property {function():void} destroy
   */

  /**
   * Creates a PendingDial that wraps the underlying DialRequest
   * @private
   * @param {DialTarget} dialTarget
   * @param {object} [options]
   * @param {AbortSignal} [options.signal] An AbortController signal
   * @returns {PendingDial}
   */
  _createPendingDial (dialTarget: DialTarget, options: any): PendingDial {
    const dialAction = (addr: Multiaddr, options) => {
      // if (options.signal.aborted) {
      //   throw(new Error('already aborted'))
      // }
      return this.transportManager.dial(addr, options)
    }

    const dialRequest = new DialRequest(
      dialTarget.addrs,
      this,
      dialAction
    )

    const pendingDial: PendingDial = {
      dialRequest,
      promise: dialRequest.run(options),
      destroy: () => {
        this.pendingDials.delete(dialTarget.id)
      }
    }
    this.pendingDials.set(dialTarget.id, pendingDial)
    return pendingDial
  }

  getTokens(num: number): number[] {
    const total = Math.min(num, this.perPeerLimit, this.tokens.length)
    const tokens = this.tokens.splice(0, total)
    console.log('%d tokens request, returning %d, %d remaining', num, total, this.tokens.length)
    return tokens
  }

  releaseToken(token: number): void {
    // Guard against duplicate releases
    if (this.tokens.indexOf(token) > -1) return
    console.log('token %d released', token)
    this.tokens.push(token)
  }

  /**
   * Converts the given `peer` into a `PeerInfo` or `Multiaddr`.
   * @static
   * @param {PeerInfo|PeerId|Multiaddr} peer
   * @returns {PeerInfo|Multiaddr}
   */
  static getDialable(peer: Dialable): Dialable {
    if (peer instanceof PeerInfo) {
      return peer
    }

    if (typeof peer === 'string') {
      return new Multiaddr(peer)
    }

    let addr: Multiaddr | undefined = undefined
    let peerId: PeerId | undefined = undefined
    if (Multiaddr.isMultiaddr(peer)) {
      addr = peer
      try {
        peerId = PeerId.createFromCID(peer.getPeerId())
      } catch (err) {
        throw(new Error('The multiaddr did not contain a valid peer id'))
      }
    }

    if (peerId) {
      let peerInfo = new PeerInfo(peerId)
      addr && peerInfo.multiaddrs.add(addr)
      return peerInfo
    }

    return peer
  }
}

export default Dialer
