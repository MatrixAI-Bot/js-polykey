import PeerId from "peer-id"
import PeerStore from "./PeerStore/PeerStore"
import { DistributedHashTable } from "./HashTable/DistributedHashTable";
import PeerInfo from "./PeerStore/PeerInfo";
import Multiaddr from "multiaddr";
import DialRequest from "./Dialer/DialRequest";
import Dialer from "./Dialer/Dialer";
import { TCP } from "./Transport/TCP";
import { MultiaddrConnection } from "./Transport/SocketToConnection";
import { EventEmitter } from "events";
import TransportManager from "./Transport/TransportManager";


class PolykeyNode extends EventEmitter {
  peerInfo: PeerInfo

  dht: DistributedHashTable
  peerStore: PeerStore
  transportManager: TransportManager
  dialer: Dialer

  _isStarted: boolean

  constructor(peerId: PeerId) {
    super()
    this.peerInfo = new PeerInfo(peerId)
    this.dht = new DistributedHashTable(peerId)
    this.peerStore = new PeerStore()
    this.transportManager = new TransportManager()
    this.dialer = new Dialer(this.transportManager, this.peerStore)

    this._onDiscoveryPeer = this._onDiscoveryPeer.bind(this)
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
    for (const ma of this.transportManager.getAddrs()) {
      this.peerInfo.multiaddrs.add(ma)
    }

    if (this._config.pubsub.enabled) {
      this.pubsub && this.pubsub.start()
    }

    // DHT subsystem
    if (this._config.dht.enabled) {
      this.dht && this.dht.start()

      // TODO: this should be modified once random-walk is used as
      // the other discovery modules
      this.dht.on('peer', this._onDiscoveryPeer)
    }
  }

  /**
   * Called when libp2p has started and before it returns
   * @private
   */
  async _onDidStart () {
    this._isStarted = true

    this.connectionManager.start()

    this.peerStore.on('peer', peerInfo => {
      this.emit('peer:discovery', peerInfo)
      this._maybeConnect(peerInfo)
    })

    // Peer discovery
    await this._setupPeerDiscovery()

    // Once we start, emit and dial any peers we may have already discovered
    for (const peerInfo of this.peerStore.peers.values()) {
      this.emit('peer:discovery', peerInfo)
      this._maybeConnect(peerInfo)
    }
  }


  /**
   * Stop the libp2p node by closing its listeners and open connections
   * @async
   * @returns {void}
   */
  async stop() {
    console.log('polykey node is stopping')

    try {
      for (const service of this._discovery.values()) {
        service.removeListener('peer', this._onDiscoveryPeer)
      }

      await Promise.all(Array.from(this._discovery.values(), s => s.stop()))

      this._discovery = new Map()

      this.connectionManager.stop()

      await Promise.all([
        this.pubsub && this.pubsub.stop(),
        this._dht && this._dht.stop(),
        this.metrics && this.metrics.stop()
      ])

      await this.transportManager.close()
      await this.registrar.close()

      ping.unmount(this)
      this.dialer.destroy()
    } catch (err) {
      if (err) {
        this.emit('error', err)
      }
    }
    this._isStarted = false
    console.log('polykey node has stopped')
  }

  async dialPeer(peerId: PeerId): Promise<MultiaddrConnection> {

    const peerInfo = this.peerStore.get(peerId)
    if (!peerInfo) {
      throw(new Error('peer does not exist in peer store'))
    }

    const conn = await this.dialer.connectToPeer(peerInfo)

    return conn
  }

  async findPeer(peerId: PeerId) {
    const peer = await this.dht.find(peerId)



  }

  pingPeer(peerId: PeerId) {

    this.dht.find
  }

  /**
   * Called whenever peer discovery services emit `peer` events.
   * Known peers may be emitted.
   * @private
   * @param {PeerInfo} peerInfo
   */
  _onDiscoveryPeer(peerInfo: PeerInfo) {
    if (peerInfo.id.toB58String() === this.peerInfo.id.toB58String()) {
      throw(new Error('discovered self'))
    }
    this.peerStore.put(peerInfo)
  }
}

export default PolykeyNode
