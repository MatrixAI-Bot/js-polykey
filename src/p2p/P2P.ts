import PeerId = require("peer-id");
import { DistributedHashTable } from "./HashTable/DistributedHashTable";

export class Networking {
  dht: DistributedHashTable

  constructor(id: PeerId) {
    this.dht = new DistributedHashTable(id)

  }

  dialPeer(peerId: PeerId) {

  }

  findPeer(peerId: PeerId) {


  }

  pingPeer(peerId: PeerId) {

  }
}
