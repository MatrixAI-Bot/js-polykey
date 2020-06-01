import PeerStore from "./PeerStore/PeerStore"
// import KademliaDHT from "./DistributedHashTable/KademliaDHT";
import PeerInfo from "./PeerStore/PeerInfo";
import Multiaddr from "multiaddr";
// import DialRequest from "./Dialer/DialRequest";
// import Dialer, { Dialable } from "./Dialer/Dialer";
import { TCP } from "./Transport/TCP";
import { EventEmitter } from "events";
import TransportManager from "./Transport/TransportManager";
import net from 'net'
import MulticastPeerDiscovery from "./PeerDiscovery/MulticastPeerDiscovery";
import { KeyManager } from "@polykey/KeyManager";

class PolykeyNode extends EventEmitter {
  // dht: KademliaDHT
  peerStore: PeerStore
  transportManager: TransportManager
  // dialer: Dialer

  multicastPeerDiscovery: MulticastPeerDiscovery

  isStarted: boolean

  constructor(
    pubKey: string,
    keyManager: KeyManager
  ) {
    super()
    this.peerStore = new PeerStore(new PeerInfo(pubKey))

    this.transportManager = new TransportManager(this._onTransportConnection.bind(this))
    // this.dialer = new Dialer(this.transportManager, this.peerStore)

    this.multicastPeerDiscovery = new MulticastPeerDiscovery(this.peerStore, keyManager)

    // this.dht = new KademliaDHT(this.peerStore.peerInfo, this.dialer, this.peerStore)

    // this._onDiscoveryPeer = this._onDiscoveryPeer.bind(this)
    this.isStarted = false
  }

  private _onTransportConnection(conn: net.Socket): void {
    // // Set up routing
    // this._handleKademliaRouting.bind(this)(conn)
  }

  // private _handleKademliaRouting(conn: net.Socket) {
  //   conn.on('data', async (data) => {
  //     if (RPCMessage.messageType(data) === MessageType.FindNode) {
  //       // Decode message
  //       const { requestingPeerInfo, numClosestPeers, closestPeerInfoArray } = RPCMessage.decodeFindNodeMessage(data)

  //       // Go and find closest peers
  //       console.log('Go and find closest peers');

  //       const closestPeerIds = await this.dht.routingTable.closestPeers(requestingPeerInfo.id, numClosestPeers)
  //       const closestPeerInfos: PeerInfo[] =[]
  //       for (const peerId of closestPeerIds) {
  //         const peerInfo = this.peerStore.get(peerId)
  //         if (peerInfo) {
  //           closestPeerInfos.push(peerInfo)
  //         }
  //       }
  //       const responseBuffer = RPCMessage.encodeFindNodeMessage(requestingPeerInfo, numClosestPeers, closestPeerInfos)
  //       console.log(RPCMessage.decodeFindNodeMessage(responseBuffer));

  //       conn.write(responseBuffer, (err) => {
  //         if (err) {
  //           console.log('Error when handling FIND_NODE request (target node)');
  //           console.log(err);
  //         }
  //       })
  //     } else {
  //       console.log('could not determine which message type it is');
  //     }
  //   })
  // }

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
    const multiaddrs = Array.from(this.peerStore.peerInfo.multiaddrs.values())

    await this.transportManager.listen(multiaddrs)

    // The addresses may change once the listener starts
    // eg /ip4/0.0.0.0/tcp/0 => /ip4/192.168.1.0/tcp/58751
    this.peerStore.peerInfo.multiaddrs.clear()

    for (const ma of this.transportManager.getAddrs()) {
      this.peerStore.peerInfo.multiaddrs.add(ma)
    }

    // Begin multicasting
    await this.multicastPeerDiscovery.start()

    // if (this._config.pubsub.enabled) {
    //   this.pubsub && this.pubsub.start()
    // }

    // // DHT subsystem
    // this.dht.start()

    // // TODO: this should be modified once random-walk is used as
    // // the other discovery modules
    // this.dht.on('peer', this._onDiscoveryPeer)
  }

  /**
   * Called when polykey has started and before it returns
   * @private
   */
  async _onDidStart () {
    this.isStarted = true

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

      // Stop multicasting
      await this.multicastPeerDiscovery.stop()

      // this.dialer.destroy()
    } catch (err) {
      if (err) {
        this.emit('error', err)
      }
    }
    this.isStarted = false
    console.log('polykey node has stopped')
  }

  // async dialPeer(peerId: PeerId): Promise<net.Socket> {

  //   const peerInfo = this.peerStore.get(peerId)
  //   if (!peerInfo) {
  //     throw(new Error('peer does not exist in peer store'))
  //   }

  //   const conn = await this.dialer.connectToPeer(peerInfo)

  //   return conn
  // }

  // async dial(peer: PeerInfo): Promise<net.Socket> {
  //   const socket = await this.dialProtocol(peer)
  //   return socket
  // }

  // /**
  //  * Dials to the provided peer and handshakes with the given protocol.
  //  * If successful, the `PeerInfo` of the peer will be added to the nodes `peerStore`,
  //  * and the `Connection` will be sent in the callback
  //  *
  //  * @async
  //  * @param {PeerInfo|PeerId|Multiaddr|string} peer The peer to dial
  //  * @param {string[]|string} protocols
  //  * @param {object} options
  //  * @param {AbortSignal} [options.signal]
  //  * @returns {Promise<Connection|*>}
  //  */
  // async dialProtocol (peer: Dialable, options?: any): Promise<net.Socket> {
  //   const dialable = Dialer.getDialable(peer)
  //   let connection: net.Socket
  //   if (dialable instanceof PeerInfo) {
  //     this.addPeer(dialable)
  //     connection = await this.dialer.connectToPeer(dialable, options)
  //   } else {
  //     connection = await this.transportManager.dial(dialable, options)
  //   }

  //   return connection
  // }

  private addPeer(peerInfo: PeerInfo) {
    this.peerStore.add(peerInfo)
    // this.dht.routingTable.addPeer(peerInfo.id)
  }

  // async findPeer(peerId: PeerId): Promise<PeerInfo | null> {

  //   const peerInfo = await this.dht.findPeer(peerId)

  //   return peerInfo
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
