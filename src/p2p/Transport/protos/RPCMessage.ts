import { Root, Type } from "protobufjs"; // respectively "./node_modules/protobufjs"
import PeerId = require("peer-id");
import Multiaddr from "multiaddr";
import PeerInfo from "../../PeerStore/PeerInfo";

enum MessageType {
  Ping,
  FindNode,
  None
}

type FindNodeMessage = {
  requestingPeerInfo: PeerInfo
  numClosestPeers: number
  closestPeerInfoArray: PeerInfo[]
}

class RPCMessage {
  private static getFindNodeMessage(): Type {
    const jsonDescriptor = require('./FindNodeMessage.json')

    const root = Root.fromJSON(jsonDescriptor);

    return root.lookupType("FindNodeMessage");
  }
  static messageType(buffer: Uint8Array): MessageType {
    try {
      this.decodeFindNodeMessage(buffer)
      return MessageType.FindNode
    } catch {}
    return MessageType.None
  }
  static encodeFindNodeMessage(
    requestingPeerInfo: PeerInfo,
    numClosestPeers: number,
    closestPeerInfoArray: PeerInfo[] = []
  ): Uint8Array {
    const FindNodeMessage = this.getFindNodeMessage()

    const closestPeersArray = closestPeerInfoArray.map((p) => {return this.encodePeerInfo(p)})
    // Exemplary payload
    const payload = {
      requestingPeerInfo: this.encodePeerInfo(requestingPeerInfo),
      numClosestPeers: numClosestPeers,
      closestPeerInfoArray: closestPeersArray
    }

    // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
    const errMsg = FindNodeMessage.verify(payload);
    if (errMsg) {
        throw Error(errMsg);
    }

    // Create a new message
    const message = FindNodeMessage.create(payload); // or use .fromObject if conversion is necessary

    // Encode a message to an Uint8Array (browser) or Buffer (node)
    const buffer = FindNodeMessage.encode(message).finish();

    return buffer
  }

  static decodeFindNodeMessage(buffer: Uint8Array): FindNodeMessage {

    const FindNodeMessage = this.getFindNodeMessage()

    // Decode an Uint8Array (browser) or Buffer (node) to a message
    const message = FindNodeMessage.decode(buffer);

    // Maybe convert the message back to a plain object
    const object = FindNodeMessage.toObject(message, {
      enums: String,  // enums as string names
      longs: String,  // longs as strings (requires long.js)
      bytes: String,  // bytes as base64 encoded strings
      defaults: true, // includes default values
      arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
      objects: true,  // populates empty objects (map fields) even if defaults=false
      oneofs: true    // includes virtual oneof fields set to the present field's name
    });

    const requestingPeerInfo = this.decodePeerInfo(object.requestingPeerInfo)
    const numClosestPeers: number = object.numClosestPeers

    const closestPeerInfoArray: PeerInfo[] = []
    for (const info of object.closestPeerInfoArray) {
      const peerInfo = this.decodePeerInfo(info)
      closestPeerInfoArray.push(peerInfo)
    }

    return {
      requestingPeerInfo: requestingPeerInfo,
      numClosestPeers: numClosestPeers,
      closestPeerInfoArray: closestPeerInfoArray
    }
  }

  private static encodePeerInfo(peerInfo: PeerInfo): Uint8Array {
    const jsonDescriptor = require('./PeerInfo.json')

    const root = Root.fromJSON(jsonDescriptor);

    const PeerInfoMessage = root.lookupType("PeerInfo");

    const multiaddrs: string[] = []
    for (const ma of peerInfo.multiaddrs) {
      multiaddrs.push(ma.toString())
    }

    // Exemplary payload
    const payload = {
      id: peerInfo.id.toB58String(),
      multiaddrs: multiaddrs,
      protocols: Array.from(peerInfo.protocols),
      connectedMultiaddr: peerInfo.connectedMultiaddr?.buffer
    }

    // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
    const errMsg = PeerInfoMessage.verify(payload);
    if (errMsg) {
        throw Error(errMsg);
    }

    // Create a new message
    const message = PeerInfoMessage.create(payload); // or use .fromObject if conversion is necessary

    // Encode a message to an Uint8Array (browser) or Buffer (node)
    const buffer = PeerInfoMessage.encode(message).finish();

    return buffer
  }

  private static decodePeerInfo(buffer: Uint8Array): PeerInfo {
    const jsonDescriptor = require('./PeerInfo.json')

    const root = Root.fromJSON(jsonDescriptor);

    const PeerInfoMessage = root.lookupType("PeerInfo");

    // Decode an Uint8Array (browser) or Buffer (node) to a message
    const message = PeerInfoMessage.decode(buffer);

    // Maybe convert the message back to a plain object
    const object = PeerInfoMessage.toObject(message, {
      enums: String,  // enums as string names
      longs: String,  // longs as strings (requires long.js)
      bytes: String,  // bytes as base64 encoded strings
      defaults: true, // includes default values
      arrays: true,   // populates empty arrays (repeated fields) even if defaults=false
      objects: true,  // populates empty objects (map fields) even if defaults=false
      oneofs: true    // includes virtual oneof fields set to the present field's name
    });

    const multiaddrs: Multiaddr[] = []
    for (const maBuf of object.multiaddrs) {
      console.log('maBuf');
      console.log(maBuf);

      const multiaddr = new Multiaddr(maBuf)
      multiaddrs.push(multiaddr)
    }

    const peerInfo = new PeerInfo(
      PeerId.createFromB58String(object.id),
      multiaddrs
    )

    peerInfo.protocols = new Set(object.protocols)

    return peerInfo
  }

}

async function main() {

  const peerId1 = await PeerId.create()
  const peerInfo1 = new PeerInfo(peerId1, [new Multiaddr('/ip4/0.0.0.0/tcp/4041')])
  const peerId2 = await PeerId.create()
  const peerInfo2 = new PeerInfo(peerId2, [new Multiaddr('/ip4/0.0.0.0/tcp/4042')])
  const peerId3 = await PeerId.create()
  const peerInfo3 = new PeerInfo(peerId3, [new Multiaddr('/ip4/0.0.0.0/tcp/4043')])


  const message = RPCMessage.encodeFindNodeMessage(peerInfo1, 20, [peerInfo2, peerInfo3])
  console.log(message);
  const decoded = RPCMessage.decodeFindNodeMessage(message)
  console.log(decoded);

}
main()


export { RPCMessage, MessageType, FindNodeMessage }
