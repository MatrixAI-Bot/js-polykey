import PeerId from "peer-id";
import Multiaddr from "multiaddr";

class PeerInfo {
  id: PeerId
  multiaddrs: Set<Multiaddr>
  protocols: Set<string>
  connectedMultiaddr: Multiaddr | null
  constructor(id: PeerId, multiaddrs?: Multiaddr[]) {
    this.id = id
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
