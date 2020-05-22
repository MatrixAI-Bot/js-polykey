// import PeerStore from "../PeerStore/PeerStore"
// import PeerId = require("peer-id")
// import PeerInfo from "../PeerStore/PeerInfo"
// import net from 'net'

// /**
//  * Responsible for notifying registered protocols of events in the network.
//  */
// class Registrar {
//   peerStore: PeerStore
//   connections: Map<PeerId, net.Socket[]>
//   topologies: Map<any, any>
//   _handle: undefined
//   /**
//    * @param {Object} props
//    * @param {PeerStore} props.peerStore
//    * @constructor
//    */
//   constructor(peerStore: PeerStore) {
//     this.peerStore = peerStore

//     /**
//      * Map of connections per peer
//      * TODO: this should be handled by connectionManager
//      * @type {Map<string, Array<conn>>}
//      */
//     this.connections = new Map()

//     /**
//      * Map of topologies
//      *
//      * @type {Map<string, object>}
//      */
//     this.topologies = new Map()

//     this._handle = undefined
//   }

//   get handle () {
//     return this._handle
//   }

//   set handle (handle) {
//     this._handle = handle
//   }

//   /**
//    * Cleans up the registrar
//    * @async
//    */
//   async close() {
//     // Close all connections we're tracking
//     const tasks: Promise<void>[] = []
//     for (const connectionList of this.connections.values()) {
//       for (const connection of connectionList) {
//         tasks.push(connection.close())
//       }
//     }

//     await Promise.all(tasks)
//     this.connections.clear()
//   }

//   /**
//    * Add a new connected peer to the record
//    * TODO: this should live in the ConnectionManager
//    * @param {PeerInfo} peerInfo
//    * @param {Connection} conn
//    * @returns {void}
//    */
//   onConnect(peerInfo: PeerInfo, conn: MultiaddrConnection): void {
//     const id = peerInfo.id
//     const storedConn = this.connections.get(id)

//     if (storedConn) {
//       storedConn.push(conn)
//     } else {
//       this.connections.set(id, [conn])
//     }
//   }

//   /**
//    * Remove a disconnected peer from the record
//    * TODO: this should live in the ConnectionManager
//    * @param {PeerInfo} peerInfo
//    * @param {Connection} connection
//    * @param {Error} [error]
//    * @returns {void}
//    */
//   onDisconnect(peerInfo: PeerInfo, connection: MultiaddrConnection, error: Error): void {
//     const id = peerInfo.id
//     let storedConn = this.connections.get(id)

//     if (storedConn && storedConn.length > 1) {
//       storedConn = storedConn.filter((conn) => conn.id !== connection.id)
//       this.connections.set(id, storedConn)
//     } else if (storedConn) {
//       for (const [, topology] of this.topologies) {
//         topology.disconnect(peerInfo, error)
//       }

//       this.connections.delete(peerInfo.id)
//     }
//   }

//   /**
//    * Get a connection with a peer.
//    * @param {PeerInfo} peerInfo
//    * @returns {Connection}
//    */
//   getConnection (peerInfo) {
//     if (!PeerInfo.isPeerInfo(peerInfo)) {
//       throw errcode(new Error('peerInfo must be an instance of peer-info'), ERR_INVALID_PARAMETERS)
//     }

//     const connections = this.connections.get(peerInfo.id.toB58String())
//     // Return the first, open connection
//     if (connections) {
//       return connections.find(connection => connection.stat.status === 'open')
//     }
//     return null
//   }

//   /**
//    * Register handlers for a set of multicodecs given
//    * @param {Topology} topology protocol topology
//    * @return {string} registrar identifier
//    */
//   register (topology) {
//     if (!Topology.isTopology(topology)) {
//       throw errcode(new Error('topology must be an instance of interfaces/topology'), ERR_INVALID_PARAMETERS)
//     }

//     // Create topology
//     const id = (parseInt(Math.random() * 1e9)).toString(36) + Date.now()

//     this.topologies.set(id, topology)

//     // Set registrar
//     topology.registrar = this

//     return id
//   }

//   /**
//    * Unregister topology.
//    * @param {string} id registrar identifier
//    * @return {boolean} unregistered successfully
//    */
//   unregister (id) {
//     return this.topologies.delete(id)
//   }
// }

// module.exports = Registrar
