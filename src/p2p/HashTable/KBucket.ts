import { randomBytes } from 'crypto'
import { EventEmitter } from 'events'
import PeerId from 'peer-id'

// Background reading:
// https://docs.google.com/presentation/d/11qGZlPWu6vEAhA7p3qsQaQtWH7KofEC9dMeBFZ1gYeA/edit#slide=id.g1718cc2bc_0643

/**
 * @param  {Uint8Array} buffer1
 * @param  {Uint8Array} buffer2
 * @return {Boolean}
 */
function arrayEquals(array1: Uint8Array, array2: Uint8Array): boolean {
  if (array1 === array2) {
    return true
  }
  if (array1.length !== array2.length) {
    return false
  }
  for (let i = 0, length = array1.length; i < length; ++i) {
    if (array1[i] !== array2[i]) {
      return false
    }
  }
  return true
}

function createNode(): Node {
  return { contacts: [], dontSplit: false, left: null, right: null }
}

type Node = {
  contacts: PeerContact[] | null
  dontSplit: boolean
  left: Node | null
  right: Node | null
}

type KBucketMetadata = {

}

export type PeerContact = {
  id: Buffer,
  peer: PeerId
}

/**
 * Implementation of a Kademlia DHT k-bucket used for storing
 * contact (peer node) information.
 *
 * @extends EventEmitter
 */
class KBucket extends EventEmitter {
  localNodeId: Buffer
  numberOfNodesPerKBucket: number
  numberOfNodesToPing: number
  metadata: KBucketMetadata
  root: Node
  distance: any
  arbiter: any
  /**
   * `options`:
   *   `distance`: _Function_
   *     `function (firstId, secondId) { return distance }` An optional
   *     `distance` function that gets two `id` Uint8Arrays
   *     and return distance (as number) between them.
   *   `arbiter`: _Function_ _(Default: vectorClock arbiter)_
   *     `function (incumbent, candidate) { return contact; }` An optional
   *     `arbiter` function that givent two `contact` objects with the same `id`
   *     returns the desired object to be used for updating the k-bucket. For
   *     more details, see [arbiter function](#arbiter-function).
   *   `localNodeId`: _Uint8Array_ An optional Uint8Array representing the local node id.
   *     If not provided, a local node id will be created via `randomBytes(20)`.
   *     `metadata`: _Object_ _(Default: {})_ Optional satellite data to include
   *     with the k-bucket. `metadata` property is guaranteed not be altered by,
   *     it is provided as an explicit container for users of k-bucket to store
   *     implementation-specific data.
   *   `numberOfNodesPerKBucket`: _Integer_ _(Default: 20)_ The number of nodes
   *     that a k-bucket can contain before being full or split.
   *     `numberOfNodesToPing`: _Integer_ _(Default: 3)_ The number of nodes to
   *     ping when a bucket that should not be split becomes full. KBucket will
   *     emit a `ping` event that contains `numberOfNodesToPing` nodes that have
   *     not been contacted the longest.
   *
   * @param {Object=} options optional
   */
  constructor (options: {
    localNodeId?: Buffer,
    numberOfNodesPerKBucket?: number,
    numberOfNodesToPing?: number,
    distance?: any,
    arbiter?: any,
    metadata?: any
  }) {
    super()

    this.localNodeId = options.localNodeId || randomBytes(20)
    this.numberOfNodesPerKBucket = options.numberOfNodesPerKBucket || 20
    this.numberOfNodesToPing = options.numberOfNodesToPing || 3
    this.distance = options.distance || KBucket.distance
    // use an arbiter from options or vectorClock arbiter by default
    this.arbiter = options.arbiter || KBucket.arbiter
    this.metadata = Object.assign({}, options.metadata)

    this.root = createNode()
  }

  /**
   * Default arbiter function for contacts with the same id. Uses
   * contact.vectorClock to select which contact to update the k-bucket with.
   * Contact with larger vectorClock field will be selected. If vectorClock is
   * the same, candidate will be selected.
   *
   * @param  {Object} incumbent Contact currently stored in the k-bucket.
   * @param  {Object} candidate Contact being added to the k-bucket.
   * @return {Object}           Contact to updated the k-bucket with.
   */
  static arbiter(incumbent: Buffer, candidate: Buffer): Buffer {
    // this would neeed to be calculated from some kind of vectorClock
    return candidate
    // return incumbent.vectorClock > candidate.vectorClock ? incumbent : candidate
  }

  /**
   * Default distance function. Finds the XOR
   * distance between firstId and secondId.
   *
   * @param  {Buffer} firstId  Buffer containing first id.
   * @param  {Buffer} secondId Buffer containing second id.
   * @return {Number}          Integer The XOR distance between firstId
   *                           and secondId.
   */
  static distance(firstId: Buffer, secondId: Buffer): number {
    let distance = 0
    let i = 0
    const min = Math.min(firstId.length, secondId.length)
    const max = Math.max(firstId.length, secondId.length)
    for (; i < min; ++i) {
      distance = distance * 256 + (firstId[i] ^ secondId[i])
    }
    for (; i < max; ++i) distance = distance * 256 + 255
    return distance
  }

  /**
   * Adds a contact to the k-bucket.
   *
   * @param {Object} contact the contact object to add
   */
  add(contact: PeerContact) {
    let bitIndex = 0
    let node = this.root

    while (node.contacts === null) {
      console.log('skljdf');

      // this is not a leaf node but an inner node with 'low' and 'high'
      // branches; we will check the appropriate bit of the identifier and
      // delegate to the appropriate node for further processing
      const innerNode = this._determineNode(node, contact.id, bitIndex++)
      if (innerNode) {
        node = innerNode
      }
    }

    // check if the contact already exists
    const index = this._indexOf(node, contact.id)
    if (index >= 0) {
      this._update(node, index, contact)
      return this
    }

    if (node.contacts.length < this.numberOfNodesPerKBucket) {
      node.contacts.push(contact)
      this.emit('added', contact)
      return this
    }

    // the bucket is full
    if (node.dontSplit) {
      // we are not allowed to split the bucket
      // we need to ping the first this.numberOfNodesToPing
      // in order to determine if they are alive
      // only if one of the pinged nodes does not respond, can the new contact
      // be added (this prevents DoS flodding with new invalid contacts)
      this.emit('ping', node.contacts.slice(0, this.numberOfNodesToPing), contact)
      return this
    }

    this._split(node, bitIndex)
    return this.add(contact)
  }

  /**
   * Get the n closest contacts to the provided node id. "Closest" here means:
   * closest according to the XOR metric of the contact node id.
   *
   * @param  {Uint8Array} id  Contact node id
   * @param  {Number=} num      Integer (Default: Infinity) The maximum number of
   *                          closest contacts to return
   * @return {Array}          Array Maximum of n closest contacts to the node id
   */
  closest(id: Uint8Array, num: number = Infinity): PeerContact[] {
    if ((!Number.isInteger(num) && num !== Infinity) || num <= 0) {
      throw new TypeError('n is not positive number')
    }

    let contacts: PeerContact[] = []

    for (let nodes = [ this.root ], bitIndex = 0; nodes.length > 0 && contacts.length < num;) {
      const node = nodes.pop()
      if (node) {
        if (node.contacts === null) {
          const detNode = this._determineNode(node, id, bitIndex++)
          const nodeToBePushed = (node.left === detNode) ? node.right : node.left
          if (nodeToBePushed) {
            nodes.push(nodeToBePushed)
          }
          if (detNode) {
            nodes.push(detNode)
          }
        } else {
          contacts = contacts.concat(node.contacts)
        }
      }
    }

    return contacts
      .map(a => {
        return [this.distance(a.id, id), a]
      })
      .sort((a, b) => {
        return a[0] - b[0]
      })
      .slice(0, num)
      .map(a => a[1])
  }

  /**
   * Counts the total number of contacts in the tree.
   *
   * @return {Number} The number of contacts held in the tree
   */
  count(): number {
    // return this.toArray().length
    let count = 0
    for (const nodes = [ this.root ]; nodes.length > 0;) {
      const node = nodes.pop()
      if (node) {
        if (node.contacts === null) {
          nodes.push({contacts: [], right: node.right, left: node.left, dontSplit: true})
        } else {
          count += node.contacts.length
        }
      }
    }
    return count
  }

  /**
   * Determines whether the id at the bitIndex is 0 or 1.
   * Return left leaf if `id` at `bitIndex` is 0, right leaf otherwise
   *
   * @param  {Object} node     internal object that has 2 leafs: left and right
   * @param  {Uint8Array} id   Id to compare localNodeId with.
   * @param  {Number} bitIndex Integer (Default: 0) The bit index to which bit
   *                           to check in the id Uint8Array.
   * @return {Object}          left leaf if id at bitIndex is 0, right leaf otherwise.
   */
  _determineNode(node: Node, id: Uint8Array, bitIndex: number): Node | null {
    // **NOTE** remember that id is a Uint8Array and has granularity of
    // bytes (8 bits), whereas the bitIndex is the _bit_ index (not byte)

    // id's that are too short are put in low bucket (1 byte = 8 bits)
    // (bitIndex >> 3) finds how many bytes the bitIndex describes
    // bitIndex % 8 checks if we have extra bits beyond byte multiples
    // if number of bytes is <= no. of bytes described by bitIndex and there
    // are extra bits to consider, this means id has less bits than what
    // bitIndex describes, id therefore is too short, and will be put in low
    // bucket
    const bytesDescribedByBitIndex = bitIndex >> 3
    const bitIndexWithinByte = bitIndex % 8
    if ((id.length <= bytesDescribedByBitIndex) && (bitIndexWithinByte !== 0)) {
      return node.left
    }

    const byteUnderConsideration = id[bytesDescribedByBitIndex]

    // byteUnderConsideration is an integer from 0 to 255 represented by 8 bits
    // where 255 is 11111111 and 0 is 00000000
    // in order to find out whether the bit at bitIndexWithinByte is set
    // we construct (1 << (7 - bitIndexWithinByte)) which will consist
    // of all bits being 0, with only one bit set to 1
    // for example, if bitIndexWithinByte is 3, we will construct 00010000 by
    // (1 << (7 - 3)) -> (1 << 4) -> 16
    if (byteUnderConsideration & (1 << (7 - bitIndexWithinByte))) {
      return node.right
    }

    return node.left
  }

  /**
   * Get a contact by its exact ID.
   * If this is a leaf, loop through the bucket contents and return the correct
   * contact if we have it or null if not. If this is an inner node, determine
   * which branch of the tree to traverse and repeat.
   *
   * @param  {Uint8Array} id The ID of the contact to fetch.
   * @return {PeerInfo|Null}   The contact if available, otherwise null
   */
  get(id: Uint8Array): PeerContact | null {
    let bitIndex = 0

    let node = this.root
    while (node.contacts === null) {
      const innerNode = this._determineNode(node, id, bitIndex++)
      if (innerNode) {
        node = innerNode
      }
    }

    // index of uses contact id for matching
    const index = this._indexOf(node, id)
    return index >= 0 ? node.contacts[index] : null
  }

  /**
   * Returns the index of the contact with provided
   * id if it exists, returns -1 otherwise.
   *
   * @param  {Object} node    internal object that has 2 leafs: left and right
   * @param  {Uint8Array} id  Contact node id.
   * @return {Number}         Integer Index of contact with provided id if it
   *                          exists, -1 otherwise.
   */
  _indexOf(node: Node, id: Uint8Array): number {
    if (node.contacts) {
      for (let i = 0; i < node.contacts.length; ++i) {
        const foundId = node.contacts[i].id
        if (arrayEquals(foundId, id)) return i
      }
    }

    return -1
  }

  /**
   * Removes contact with the provided id.
   *
   * @param  {Uint8Array} id The ID of the contact to remove.
   * @return {Object}        The k-bucket itself.
   */
  remove(id: Uint8Array): KBucket {
    let bitIndex = 0
    let node = this.root

    while (node.contacts === null) {
      const innerNode = this._determineNode(node, id, bitIndex++)
      if (innerNode) {
        node = innerNode
      }
    }

    const index = this._indexOf(node, id)
    if (index >= 0) {
      const contact = node.contacts.splice(index, 1)[0]
      this.emit('removed', contact)
    }

    return this
  }

  /**
   * Splits the node, redistributes contacts to the new nodes, and marks the
   * node that was split as an inner node of the binary tree of nodes by
   * setting this.root.contacts = null
   *
   * @param  {Object} node     node for splitting
   * @param  {Number} bitIndex the bitIndex to which byte to check in the
   *                           Uint8Array for navigating the binary tree
   */
  _split(node: Node, bitIndex: number): void {
    node.left = createNode()
    node.right = createNode()

    // redistribute existing contacts amongst the two newly created nodes
    if (node.contacts) {
      for (const contact of node.contacts) {
        const innerNode = this._determineNode(node, contact.id, bitIndex)
        if (innerNode && innerNode.contacts) {
          innerNode.contacts.push(contact)
        }
      }
    }

    node.contacts = [] // mark as inner tree node

    // don't split the "far away" node
    // we check where the local node would end up and mark the other one as
    // "dontSplit" (i.e. "far away")
    const detNode = this._determineNode(node, this.localNodeId, bitIndex)
    const otherNode = node.left === detNode ? node.right : node.left
    otherNode.dontSplit = true
  }

  /**
   * Returns all the contacts contained in the tree as an array.
   * If this is a leaf, return a copy of the bucket. `slice` is used so that we
   * don't accidentally leak an internal reference out that might be
   * accidentally misused. If this is not a leaf, return the union of the low
   * and high branches (themselves also as arrays).
   *
   * @return {Array} All of the contacts in the tree, as an array
   */
  toArray(): PeerContact[] {
    let result: PeerContact[] = []
    for (const nodes = [ this.root ]; nodes.length > 0;) {
      const node = nodes.pop()
      if (node) {
        if (node.contacts === null) {
          if (node.right) {
            nodes.push(node.right)
          }
          if (node.left) {
            nodes.push(node.left)
          }
        }
        else {
          result = result.concat(node.contacts)
        }
      }
    }
    return result
  }

  /**
   * Updates the contact selected by the arbiter.
   * If the selection is our old contact and the candidate is some new contact
   * then the new contact is abandoned (not added).
   * If the selection is our old contact and the candidate is our old contact
   * then we are refreshing the contact and it is marked as most recently
   * contacted (by being moved to the right/end of the bucket array).
   * If the selection is our new contact, the old contact is removed and the new
   * contact is marked as most recently contacted.
   *
   * @param  {Object} node    internal object that has 2 leafs: left and right
   * @param  {Number} index   the index in the bucket where contact exists
   *                          (index has already been computed in a previous
   *                          calculation)
   * @param  {Object} contact The contact object to update.
   */
  _update(node: Node, index: number, contact: PeerContact) {
    // sanity check
    if (node.contacts && (!arrayEquals(node.contacts[index].id, contact.id))) {
      throw new Error('wrong index for _update')
    }

    const incumbent = node.contacts![index]
    const selection = this.arbiter(incumbent, contact)
    // if the selection is our old contact and the candidate is some new
    // contact, then there is nothing to do
    if (selection === incumbent && incumbent !== contact) return

    node.contacts!.splice(index, 1) // remove old contact
    node.contacts!.push(selection) // add more recent contact version
    this.emit('updated', incumbent, selection)
  }
}


export default KBucket
