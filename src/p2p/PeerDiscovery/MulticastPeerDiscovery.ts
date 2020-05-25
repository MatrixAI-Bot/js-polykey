
import { EventEmitter } from 'events'
import PeerId = require('peer-id')
import Multiaddr from 'multiaddr'
import PeerInfo from '../PeerStore/PeerInfo'
import PeerStore from '../PeerStore/PeerStore'
import os from 'os'
import KeyManager from '../../KeyManager'
import dgram from 'dgram'
import crypto from 'crypto'
import { RPCMessage } from '../RPC/RPCMessage'

// This peer discovery module uses the following lib:
// https://github.com/mafintosh/multicast-dns and is also
// based heavily on libp2p's mDNS module:
// https://github.com/libp2p/js-libp2p-mdns
// It is supposed to discover peers on the local network
// This module was also generated with the help of:
// https://nrempel.com/using-udp-multicast-with-node-js/
//
// """
// In computer networking, the multicast DNS (mDNS) protocol
// resolves hostnames to IP addresses within small networks
// that do not include a local name server
// """

const UDP_MULTICAST_PORT = 5353;
const UDP_MULTICAST_ADDR = "224.0.0.251";

type PeerMessage = {
  localPubKey: Buffer
  peerPubKey: Buffer
  raw: Buffer
  encrypted: Buffer
}

class MulticastPeerDiscovery {
  peerStore: PeerStore
  keyManager: KeyManager

  socket: dgram.Socket


  interval: number
  _queryInterval: NodeJS.Timeout | null
  peerPubKeyMessages: Map<string, PeerMessage> = new Map()
  constructor(
    peerStore: PeerStore,
    keyManager: KeyManager
  ) {
    this.peerStore = peerStore
    this.keyManager = keyManager

    this.interval = (1e3)
    this._queryInterval = null
  }


  queryLAN() {
    const query = () => {
      console.log('Begin query round');
      console.log('===================================');
      for (const peerId of this.peerPubKeyMessages.keys()) {
        const peerMessage = this.peerPubKeyMessages.get(peerId)
        if (peerMessage) {
          const handshakeMessage = RPCMessage.encodeHandShakeMessage(
            peerId,
            peerMessage.localPubKey,
            peerMessage.encrypted
          )

          this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR, () => {
            console.info(`Sending message to peerId: ${peerId}`);
          });
        }

      }
    }

    // Immediately start a query, then do it every interval.
    query()
    return setInterval(query, this.interval)
  }

  /**
   * Start sending queries to the LAN.
   *
   * @returns {void}
   */
  async start(): Promise<void> {
    // Create socket
    this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true })
    this.socket.bind(UDP_MULTICAST_PORT)

    // Set up listener
    this.socket.on("listening", (() => {
      this.socket.addMembership(UDP_MULTICAST_ADDR);
      const address = this.socket.address();
      console.log(
        `UDP socket listening on ${address.address}:${address.port} pid: ${
          process.pid
        }`
      );
    }).bind(this));

    // Handle messages
    this.socket.on("message", this.handleMessages.bind(this));

    // Start the query process
    this._queryInterval = this.queryLAN()

  }

  private async handleMessages(message: any, rinfo: any) {
    try {
      const decodedMessage = RPCMessage.decodeHandShakeMessage(message)
      console.info(`Message from: ${rinfo.address}:${rinfo.port}`);

      // Try to decrypt message and pubKey
      const myPeerId = this.peerStore.peerInfo.id.toB58String()
      if (decodedMessage.requestedPeerIdB58String == myPeerId) {
        console.log(`I am peerId: ${myPeerId} and am requesting node`);
      } else {
        console.log(`I am peerId: ${myPeerId} and am receiving node`);
      }

      const decryptedMessage = await this.keyManager.decryptData(decodedMessage.message.toString())
      const decryptedPubKey = await this.keyManager.decryptData(decodedMessage.requestingPubKey.toString())

      if (decryptedPubKey.toString() == this.keyManager.getPublicKey()) { // Response
        // Make sure decrypted bytes equal raw bytes in memory
        const originalMessage = this.peerPubKeyMessages.get(decodedMessage.requestedPeerIdB58String)?.raw
        if (decryptedMessage.toString() == originalMessage?.toString()) {  // Validated!
          // Add peer info to peerStore
          const newPeerInfo = decodedMessage.responsePeerInfo
          if (newPeerInfo) {
            this.peerStore.add(newPeerInfo)
            // Remove peerId from requested messages
            const peerIdB58String = newPeerInfo.id.toB58String()
            this.peerPubKeyMessages.delete(peerIdB58String)
            console.log(`New peer added to the store: ${peerIdB58String}`);
          } else {
            console.log("I got a validated response. But no peerInfo");
          }

        } else {  // Not validated, might be a bad actor trying to spoof the call
          console.log("I got a non-validated response");
        }
      } else {
        // Try decrypting message
        // Re-encrypt the data and send it on its way
        const encryptedMessage = await this.keyManager.encryptData(decryptedMessage, decryptedPubKey)
        const encryptedPubKey = await this.keyManager.encryptData(decryptedPubKey, decryptedPubKey)
        const handshakeMessage = RPCMessage.encodeHandShakeMessage(
          this.peerStore.peerInfo.id.toB58String(),
          Buffer.from(encryptedPubKey),
          Buffer.from(encryptedMessage),
          this.peerStore.peerInfo
        )
        this.socket.send(handshakeMessage, 0, handshakeMessage.length, UDP_MULTICAST_PORT, UDP_MULTICAST_ADDR, () => {
          console.info(`Sending response from peerId: "${this.peerStore.peerInfo.id.toB58String()}"`);
        });
      }

    } catch (err) {
      console.log('Couldnt decode message!');
      // throw(err)
    }
  }

  requestPeerContact(pubKey: Buffer, destinationPeerId: PeerId) {
    const randomMessage = crypto.randomBytes(16)
    // Encrypt message
    this.keyManager.encryptData(randomMessage, pubKey).then(async (encrypted) => {
      const encryptedPubKey = await this.keyManager.encryptData(Buffer.from(this.keyManager.getPublicKey()), pubKey)
      // Add to peer messages to be sent over multicast
      this.peerPubKeyMessages.set(destinationPeerId.toB58String(), {
        localPubKey: Buffer.from(encryptedPubKey),
        peerPubKey: pubKey,
        raw: randomMessage,
        encrypted: Buffer.from(encrypted)
      })
    })
  }

  /**
   * Stop sending queries to the LAN.
   *
   * @returns {Promise}
   */
  async stop(): Promise<void> {
    // Close socket connection
    await new Promise((resolve, reject) => {
      this.socket.close(() => { resolve() })
    })

    // Clear the interval
    if (this._queryInterval) {
      clearInterval(this._queryInterval)
    }
    this._queryInterval = null
  }
}

export default MulticastPeerDiscovery
