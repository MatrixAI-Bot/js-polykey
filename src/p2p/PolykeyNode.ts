import PeerId from "peer-id"
import PeerStore from "./PeerStore/PeerStore"
import KademliaDHT from "./DistributedHashTable/KademliaDHT";
import PeerInfo from "./PeerStore/PeerInfo";
import Multiaddr from "multiaddr";
import DialRequest from "./Dialer/DialRequest";
import Dialer, { Dialable } from "./Dialer/Dialer";
import { TCP } from "./Transport/TCP";
import { EventEmitter } from "events";
import TransportManager from "./Transport/TransportManager";
import net from 'net'


class PolykeyNode extends EventEmitter {
  peerInfo: PeerInfo

  dht: KademliaDHT
  peerStore: PeerStore
  transportManager: TransportManager
  dialer: Dialer

  _isStarted: boolean

  constructor(peerId: PeerId) {
    super()
    this.peerInfo = new PeerInfo(peerId)
    this.peerStore = new PeerStore()
    this.transportManager = new TransportManager()
    this.dialer = new Dialer(this.transportManager, this.peerStore)

    this.dht = new KademliaDHT(this.peerInfo.id, this.dialer, this.peerStore)

    // this._onDiscoveryPeer = this._onDiscoveryPeer.bind(this)
    this._isStarted = false
  }

  async start() {
    try {
      await this._onStarting()
      await this._onDidStart()
      console.log('polykey node has started')
    } catch (err) {
      this.emit('error', err)
      console.log('An error occurred starting polykey node', err)
      await this.stop()
      throw err
    }
  }

  async _onStarting () {
    // Listen on the addresses supplied in the peerInfo
    const multiaddrs = Array.from(this.peerInfo.multiaddrs.values())

    await this.transportManager.listen(multiaddrs)

    // The addresses may change once the listener starts
    // eg /ip4/0.0.0.0/tcp/0 => /ip4/192.168.1.0/tcp/58751
    this.peerInfo.multiaddrs.clear()
    console.log('this.transportManager.getAddrs()');
    console.log(this.transportManager.getAddrs());

    for (const ma of this.transportManager.getAddrs()) {
      this.peerInfo.multiaddrs.add(ma)
    }

    // if (this._config.pubsub.enabled) {
    //   this.pubsub && this.pubsub.start()
    // }

    // // DHT subsystem
    // if (this._config.dht.enabled) {
    //   this.dht && this.dht.start()

    //   // TODO: this should be modified once random-walk is used as
    //   // the other discovery modules
    //   this.dht.on('peer', this._onDiscoveryPeer)
    // }
  }

  /**
   * Called when polykey has started and before it returns
   * @private
   */
  async _onDidStart () {
    this._isStarted = true

    // this.connectionManager.start()

    // this.peerStore.on('peer', peerInfo => {
    //   this.emit('peer:discovery', peerInfo)
    //   this._maybeConnect(peerInfo)
    // })

    // // Peer discovery
    // await this._setupPeerDiscovery()

    // // Once we start, emit and dial any peers we may have already discovered
    // for (const peerInfo of this.peerStore.peers.values()) {
    //   this.emit('peer:discovery', peerInfo)
    //   this._maybeConnect(peerInfo)
    // }
  }


  /**
   * Stop the polykey node by closing its listeners and open connections
   * @async
   * @returns {void}
   */
  async stop(): Promise<void> {
    console.log('polykey node is stopping')

    try {
      // for (const service of this._discovery.values()) {
      //   service.removeListener('peer', this._onDiscoveryPeer)
      // }

      // await Promise.all(Array.from(this._discovery.values(), s => s.stop()))

      // this._discovery = new Map()

      // this.connectionManager.stop()

      // await Promise.all([
      //   this.dht && this.dht.stop(),
      // ])

      await this.transportManager.close()

      this.dialer.destroy()
    } catch (err) {
      if (err) {
        this.emit('error', err)
      }
    }
    this._isStarted = false
    console.log('polykey node has stopped')
  }

  async dialPeer(peerId: PeerId): Promise<net.Socket> {

    const peerInfo = this.peerStore.get(peerId)
    if (!peerInfo) {
      throw(new Error('peer does not exist in peer store'))
    }

    const conn = await this.dialer.connectToPeer(peerInfo)

    return conn
  }


  async dial(peer: PeerInfo): Promise<net.Socket> {
    return this.dialProtocol(peer)
  }


  /**
   * Dials to the provided peer and handshakes with the given protocol.
   * If successful, the `PeerInfo` of the peer will be added to the nodes `peerStore`,
   * and the `Connection` will be sent in the callback
   *
   * @async
   * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
   * @param {string[]|string} protocols
   * @param {object} options
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Connection|*>}
   */
  async dialProtocol (peer: Dialable, options?: any): Promise<net.Socket> {
    const dialable = Dialer.getDialable(peer)
    let connection: net.Socket
    if (dialable instanceof PeerInfo) {
      this.peerStore.add(dialable)
      connection = await this.dialer.connectToPeer(dialable, options)
    } else {
      connection = await this.transportManager.dial(dialable, options)
    }

    return connection
  }
  // async findPeer(peerId: PeerId): PeerInfo | null {
  //   const peer = await this.dht.find(peerId)

  //   const peerId = this.peerStore.get(peer)
  //   if ()


  // }

  // pingPeer(peerId: PeerId) {

  //   this.dht.find
  // }

  // /**
  //  * Called whenever peer discovery services emit `peer` events.
  //  * Known peers may be emitted.
  //  * @private
  //  * @param {PeerInfo} peerInfo
  //  */
  // _onDiscoveryPeer(peerInfo: PeerInfo) {
  //   if (peerInfo.id.toB58String() === this.peerInfo.id.toB58String()) {
  //     throw(new Error('discovered self'))
  //   }
  //   this.peerStore.put(peerInfo)
  // }
}

export default PolykeyNode
