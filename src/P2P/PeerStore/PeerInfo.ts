import Multiaddr from "multiaddr";

class PeerInfo {
  publicKey: string
  multiaddrs: Set<Multiaddr>
  protocols: Set<string>
  connectedMultiaddr: Multiaddr | null
  constructor(pubKey: string, multiaddrs?: Multiaddr[]) {
    this.publicKey = pubKey
    this.multiaddrs = new Set(multiaddrs)
    this.protocols = new Set()
  }

  connect(multiaddr: Multiaddr) {
    if (this.multiaddrs.has(multiaddr)) {
    } else {

    }
    this.connectedMultiaddr = multiaddr
  }

  disconnect() {
    this.connectedMultiaddr = null
  }

}

export default PeerInfo
