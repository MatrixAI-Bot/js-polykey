import Multiaddr from "multiaddr";
import net from 'net'
import {createListener as createTCPListener, CustomEventListener} from "./Listener";
import { CODE_CIRCUIT, CODE_P2P } from "./constants";
import mafmt from 'mafmt'


function multiaddrToNetConfig(multiaddr: Multiaddr): net.NetConnectOpts {
  // const listenPath = multiaddr.getPath()
  // // unix socket listening
  // if (listenPath) {
  //   return listenPath
  // }
  // tcp listening
  const familyString = multiaddr.nodeAddress().family
  let family: number
  if (familyString === 'IPv4') {
    family = 4
  } else if (familyString === 'IPv6') {
    family = 6
  } else {
    family = <number>familyString
  }
  return {...multiaddr.toOptions(), family: family }
}

class TCP {
  constructor() {

  }

  async dial(multiaddr: Multiaddr, options: any): Promise<net.Socket> {
    options = options || {}
    const socket = await this._connect(multiaddr, options)
    // const maConn = socketToConnection(socket, { remoteAddr: multiaddr, signal: options.signal })
    console.log('new outbound connection %s', socket.address())
    // const conn = await this._upgrader.upgradeOutbound(maConn)
    // console.log('outbound connection %s upgraded', maConn.remoteAddr)
    return socket
  }

  /**
   * @private
   * @param {Multiaddr} ma
   * @param {object} options
   * @param {AbortSignal} options.signal Used to abort dial requests
   * @returns {Promise<Socket>} Resolves a TCP Socket
   */
  _connect(ma: Multiaddr, options: any): Promise<net.Socket> {
    if (options.signal && options.signal.aborted) {
      throw new Error('signal is aborted')
    }

    return new Promise<net.Socket>((resolve, reject) => {
      const start = Date.now()
      const netOptions = multiaddrToNetConfig(ma)
      const maOptions = ma.toOptions()

      const rawSocket = net.connect(netOptions)

      const onError = err => {
        err.message = `connection error ${maOptions.host}:${maOptions.port}: ${err.message}`
        done(err)
      }

      const onTimeout = () => {
        console.log('connnection timeout %s:%s', maOptions.host, maOptions.port)
        const err = new Error(`connection timeout after ${Date.now() - start}ms`)
        // Note: this will result in onError() being called
        rawSocket.emit('error', err)
      }

      const onConnect = () => {
        console.log('connection opened %j', maOptions)
        done(null)
      }

      const onAbort = () => {
        console.log('connection aborted %j', maOptions)
        rawSocket.destroy()
        done(new Error('connection aborted'))
      }

      const done = err => {
        rawSocket.removeListener('error', onError)
        rawSocket.removeListener('timeout', onTimeout)
        rawSocket.removeListener('connect', onConnect)
        options.signal && options.signal.removeEventListener('abort', onAbort)

        if (err) return reject(err)
        resolve(rawSocket)
      }

      rawSocket.on('error', onError)
      rawSocket.on('timeout', onTimeout)
      rawSocket.on('connect', onConnect)
      options.signal && options.signal.addEventListener('abort', onAbort)
    })
  }


  /**
   * Creates a TCP listener. The provided `handler` function will be called
   * anytime a new incoming Connection has been successfully upgraded via
   * `upgrader.upgradeInbound`.
   * @param {*} [options]
   * @param {function(Connection)} handler
   * @returns {Listener} A TCP listener
   */
  createListener( handler: (conn: net.Socket) => void): CustomEventListener {
    return createTCPListener(handler)
  }

  /**
   * Takes a list of `Multiaddr`s and returns only valid TCP addresses
   * @param {Multiaddr[]} multiaddrs
   * @returns {Multiaddr[]} Valid TCP multiaddrs
   */
  filter(multiaddrs: Multiaddr[]): Multiaddr[] {
    multiaddrs = Array.isArray(multiaddrs) ? multiaddrs : [multiaddrs]

    return multiaddrs.filter(ma => {
      if (ma.protoCodes().includes(CODE_CIRCUIT)) {
        return false
      }

      return mafmt.TCP.matches(ma.decapsulateCode(CODE_P2P))
    })
  }
}

export { TCP, multiaddrToNetConfig }
