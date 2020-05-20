import Multiaddr from 'multiaddr'
import {Socket} from 'net'
const toIterable = require('stream-to-it')
import {ReadStream, WriteStream} from 'fs'



function toMultiaddr(ip?: string, port?: number): Multiaddr {
  return new Multiaddr(`/ip4/${ip}/tcp/${port}`)
}

type MultiaddrConnection = {
    sink(source: any): Promise<void>;
    source: any;
    conn: Socket;
    localAddr: any;
    remoteAddr: any;
    timeline: {
      open: number,
      close: number,
    };
    close(): Promise<void>;
}

// Convert a socket into a MultiaddrConnection
// https://github.com/libp2p/interface-transport#multiaddrconnection
function socketToConnection(socket: Socket, options: { remoteAddr?: any; signal?: any; listeningAddr?: any; localAddr?: any }): MultiaddrConnection {
  options = options || {}

  // Check if we are connected on a unix path
  if (options.listeningAddr && options.listeningAddr.getPath()) {
    options.remoteAddr = options.listeningAddr
  }

  if (options.remoteAddr && options.remoteAddr.getPath()) {
    options.localAddr = options.remoteAddr
  }

  const { sink, source } = toIterable.duplex(socket)
  const maConn = {
    async sink (source) {
      // if (options.signal) {
      //   source = abortable(source, options.signal)
      // }

      try {
        await sink((async function * () {
          for await (const chunk of source) {
            // Convert BufferList to Buffer
            yield Buffer.isBuffer(chunk) ? chunk : chunk.slice()
          }
        })())
      } catch (err) {
        // If aborted we can safely ignore
        if (err.type !== 'aborted') {
          // If the source errored the socket will already have been destroyed by
          // toIterable.duplex(). If the socket errored it will already be
          // destroyed. There's nothing to do here except log the error & return.
          console.log(err)
        }
      }
    },

    // source: options.signal ? abortable(source, options.signal) : source,
    source: source,

    conn: socket,

    localAddr: options.localAddr || toMultiaddr(socket.localAddress, socket.localPort),

    // If the remote address was passed, use it - it may have the peer ID encapsulated
    remoteAddr: options.remoteAddr || toMultiaddr(socket.remoteAddress, socket.remotePort),

    timeline: { open: Date.now(), close: Date.now() },

    async close(): Promise<void> {
      if (socket.destroyed) return

      return new Promise((resolve, reject) => {
        const start = Date.now()

        // Attempt to end the socket. If it takes longer to close than the
        // timeout, destroy it manually.
        const timeout = setTimeout(() => {
          const { host, port } = maConn.remoteAddr.toOptions()
          console.log('timeout closing socket to %s:%s after %dms, destroying it manually',
            host, port, Date.now() - start)

          if (socket.destroyed) {
            console.log('%s:%s is already destroyed', host, port)
          } else {
            socket.destroy()
          }

          resolve()
        }, 1000)

        socket.once('close', () => clearTimeout(timeout))
        socket.end(() => {
          maConn.timeline.close = Date.now()
          resolve()
        })
      })
    }
  }

  socket.once('close', () => {
    // In instances where `close` was not explicitly called,
    // such as an iterable stream ending, ensure we have set the close
    // timeline
    if (!maConn.timeline.close) {
      maConn.timeline.close = Date.now()
    }
  })

  return maConn
}

export { socketToConnection, MultiaddrConnection }
