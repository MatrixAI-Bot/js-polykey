import { TCP } from "./TCP"
import { CustomEventListener } from "./Listener"
import Multiaddr from "multiaddr"
import net from 'net'

function netTcpAddressInfoToMultiaddr(addr: net.AddressInfo): Multiaddr {
  const family = (addr.family === 'IPv4') ? 'ip4' : 'ip6'
  return new Multiaddr(`/${family}/${addr.address}/tcp/${addr.port}`)
}

class TransportManager {
  /**
   * @constructor
   * @param {object} options
   * @param {Libp2p} options.libp2p The Libp2p instance. It will be passed to the transports.
   * @param {Upgrader} options.upgrader The upgrader to provide to the transports
   */

  transports: Map<string, TCP>
  listeners: Map<string, CustomEventListener[]>
  constructor() {
    this.transports = new Map()
    this.listeners = new Map()
    this.transports.set('tcp', new TCP())
  }

  /**
   * Adds a `Transport` to the manager
   *
   * @param {String} key
   * @returns {void}
   */
  add(key: string): void {
    console.log('adding %s', key)
    if (!key) {
      throw(new Error(`Transport must have a valid key, was given '${key}'`))
    }
    if (this.transports.has(key)) {
      throw(new Error('There is already a transport with this key'))
    }

    const transport = new TCP()

    this.transports.set(key, transport)
    if (!this.listeners.has(key)) {
      this.listeners.set(key, [])
    }
  }

  /**
   * Stops all listeners
   * @async
   */
  async close () {
    const tasks: Promise<void>[] = []
    for (const [key, listeners] of this.listeners) {
      console.log('closing listeners for %s', key)
      while (listeners.length) {
        const listener = listeners.pop()
        if (listener) {
          tasks.push(listener.close())
        }
      }
    }

    await Promise.all(tasks)
    console.log('all listeners closed')
    for (const key of this.listeners.keys()) {
      this.listeners.set(key, [])
    }
  }

  /**
   * Dials the given Multiaddr over it's supported transport
   * @param {Multiaddr} multiaddr
   * @param {*} options
   * @returns {Promise<Connection>}
   */
  async dial(multiaddr: Multiaddr, options?: any): Promise<net.Socket> {
    const transport = this.transportForMultiaddr(multiaddr)
    if (!transport) {
      throw(new Error(`No transport available for address ${multiaddr.toString()}`))
    }

    try {
      return await transport.dial(multiaddr, options)
    } catch (err) {
      throw err
    }
  }

  /**
   * Returns all Multiaddr's the listeners are using
   * @returns {Multiaddr[]}
   */
  getAddrs(): Multiaddr[] {
    let addrs: Multiaddr[] = []
    for (const listeners of this.listeners.values()) {
      for (const listener of listeners) {
        addrs = [...addrs, ...listener.getAddrs()]
      }
    }
    return addrs
  }

  /**
   * Returns all the transports instances.
   * @returns {Iterator<Transport>}
   */
  getTransports(): TCP[] {
    return Array.from(this.transports.values())
  }

  /**
   * Finds a transport that matches the given Multiaddr
   * @param {Multiaddr} multiaddr
   * @returns {Transport|null}
   */
  transportForMultiaddr(multiaddr: Multiaddr): TCP | null {
    for (const transport of this.transports.values()) {
      const addrs = transport.filter([multiaddr])
      if (addrs.length) return transport
    }
    return null
  }

  onConnection() {
    console.log("logging from method 'onConnection' in TransportManager");
  }

  /**
   * Starts listeners for each given Multiaddr.
   * @async
   * @param {Multiaddr[]} addrs
   */
  async listen(addrs: Multiaddr[]): Promise<void> {
    console.log('addrs');
    console.log(addrs);

    if (addrs.length === 0) {
      console.log('no addresses were provided for listening, this node is dial only')
      return
    }

    const couldNotListen: string[] = []
    for (const [key, transport] of this.transports.entries()) {
      const supportedAddrs = transport.filter(addrs)
      const tasks: Promise<net.AddressInfo | null>[] = []

      // For each supported multiaddr, create a listener
      for (const addr of supportedAddrs) {
        console.log('supportedAddrs');
        console.log(addr);

        console.log('creating listener for %s on %s', key, addr)
        const listener = transport.createListener({}, this.onConnection)
        const existingListeners = this.listeners.get(key)
        if (existingListeners) {
          existingListeners.push(listener)
          this.listeners.set(key, existingListeners)
        } else {
          this.listeners.set(key, [listener])
        }

        // We need to attempt to listen on everything
        tasks.push(listener.listen(addr))
      }

      // Keep track of transports we had no addresses for
      if (tasks.length === 0) {
        couldNotListen.push(key)
        continue
      }

      await Promise.race(tasks)
      // // If we are listening on at least 1 address, succeed.
      // // TODO: we should look at adding a retry (`p-retry`) here to better support
      // // listening on remote addresses as they may be offline. We could then potentially
      // // just wait for any (`p-any`) listener to succeed on each transport before returning
      // const isListening = results.find(r => r.isFulfilled === true)
      // if (!isListening) {
      //   throw(new Error(`Transport (${key}) could not listen on any available address`))
      // }
    }

    // If no transports were able to listen, throw an error. This likely
    // means we were given addresses we do not have transports for
    if (couldNotListen.length === this.transports.size) {
      throw(new Error(`no valid addresses were provided for transports [${couldNotListen}]`))
    }
  }

  /**
   * Removes the given transport from the manager.
   * If a transport has any running listeners, they will be closed.
   *
   * @async
   * @param {string} key
   */
  async remove(key: string): Promise<void> {
    console.log('removing %s', key)
    if (this.listeners.has(key)) {
      // Close any running listeners
      const listeners = this.listeners.get(key)
      if (listeners) {
        for (const listener of listeners) {
          await listener.close()
        }
      }
    }

    this.transports.delete(key)
    this.listeners.delete(key)
  }

  /**
   * Removes all transports from the manager.
   * If any listeners are running, they will be closed.
   * @async
   */
  async removeAll () {
    const tasks: Promise<any>[] = []
    for (const key of this.transports.keys()) {
      tasks.push(this.remove(key))
    }

    await Promise.all(tasks)
  }
}

export default TransportManager
