import Multiaddr from "multiaddr"
import { socketToConnection, MultiaddrConnection } from "./SocketToConnection"
import { EventEmitter } from "events"
import net from 'net'
import PeerId = require("peer-id")
import os from 'os'
import { CODE_P2P } from "./constants"


/**
 * Attempts to close the given maConn. If a failure occurs, it will be logged.
 * @private
 * @param {MultiaddrConnection} maConn
 */
async function attemptClose(maConn: MultiaddrConnection) {
  try {
    maConn && await maConn.close()
  } catch (err) {
    console.log('an error occurred closing the connection', err)
  }
}

/**
 * @private
 * @param {string} family One of ['IPv6', 'IPv4']
 * @returns {string[]} an array of ip address strings
 */
function getNetworkAddrs (family: string): string[] {
  const interfaces = Array.from(Object.values(os.networkInterfaces()))
  let returnAddrs: string[] = []
  if (interfaces.length !== 0) {
    returnAddrs = interfaces.reduce<string[]>((addresses, netAddrs) => {
      if (netAddrs) {
        netAddrs.forEach(netAddr => {
          // Add the ip of each matching network interface
          if (netAddr.family === family) addresses!.push(netAddr.address)
        })
      }
      return addresses
    }, [])
  }
  return returnAddrs
}

function getMultiaddrs(proto: string, ip: string, port: any) {
  const ProtoFamily = { ip4: 'IPv4', ip6: 'IPv6' }

  const toMa = ip => new Multiaddr(`/${proto}/${ip}/tcp/${port}`)
  return ((['0.0.0.0', '::'].includes(ip)) ? getNetworkAddrs(ProtoFamily[proto]) : [ip])!.map(toMa)
}

class CustomTCPServer extends net.Server {
  __connections: MultiaddrConnection[]
  constructor(connectionListener?: ((socket: net.Socket) => void) | undefined) {
    super(connectionListener)
    this.__connections = []
  }

}
class CustomEventListener extends EventEmitter {
  constructor(options?: any) {
    super(options)
  }
  async close() {

  }
  async listen(multiaddr: Multiaddr) {

  }
  getAddrs(): Multiaddr[] {
    return []
  }

}

function createListener(handler: (conn: MultiaddrConnection) => void): CustomEventListener {
  const listener = new CustomEventListener()

  const server = new CustomTCPServer(async socket => {
    // Avoid uncaught errors caused by unstable connections
    socket.on('error', err => console.log('socket error', err))

    let maConn: MultiaddrConnection
    let conn: MultiaddrConnection
    try {
      maConn = socketToConnection(socket, { listeningAddr })
      console.log('new inbound connection %s', maConn.remoteAddr)
      // conn = await upgrader.upgradeInbound(maConn)
      conn = maConn
    } catch (err) {
      console.log('inbound connection failed', err)
      return attemptClose(maConn!)
    }

    console.log('inbound connection %s upgraded', maConn.remoteAddr)

    trackConn(server, maConn)

    if (handler) {
      handler(conn)
    }
    listener.emit('connection', conn)
  })

  server
    .on('listening', () => listener.emit('listening'))
    .on('error', err => listener.emit('error', err))
    .on('close', () => listener.emit('close'))

  // Keep track of open connections to destroy in case of timeout
  server.__connections = []

  listener.close = async () => {
    if (!server.listening) return

    return new Promise((resolve, reject) => {
      server.__connections.forEach(maConn => attemptClose(maConn))
      server.close(err => err ? reject(err) : resolve())
    })
  }

  let peerId: PeerId
  let listeningAddr: Multiaddr

  listener.listen = (ma) => {
    listeningAddr = ma

    const peerIdString = ma.getPeerId()

    if (peerIdString) {
      peerId = new PeerId(peerIdString)
      listeningAddr = ma.decapsulateCode(CODE_P2P)
    }

    return new Promise((resolve, reject) => {
      const options = listeningAddr.toOptions()
      server.listen(options.port, options.host, undefined, () => {
        console.log('Listening on %s', server.address())
        resolve()
      })
    })
  }

  listener.getAddrs = () => {
    let addrs: Multiaddr[] = []
    const address = <net.AddressInfo>server.address()

    if (!address) {
      throw(new Error('Listener is not ready yet'))
    }

    // Because TCP will only return the IPv6 version
    // we need to capture from the passed multiaddr
    if (listeningAddr.toString().startsWith('/ip4')) {
      addrs = addrs.concat(getMultiaddrs('ip4', address.address, address.port))
    } else if (address.family === 'IPv6') {
      addrs = addrs.concat(getMultiaddrs('ip6', address.address, address.port))
    }

    return addrs.map(ma => peerId ? ma.encapsulate(`/p2p/${peerId}`) : ma)
  }

  return listener
}

function trackConn (server: CustomTCPServer, maConn: MultiaddrConnection) {
  server.__connections.push(maConn)

  const untrackConn = () => {
    server.__connections = server.__connections.filter(c => c !== maConn)
  }

  maConn.conn.once('close', untrackConn)
}

export { createListener, CustomTCPServer, CustomEventListener }
