// source: Peer.proto
/**
 * @fileoverview
 * @enhanceable
 * @suppress {messageConventions} JS Compiler reports an error if a variable or
 *     field starts with 'MSG_' and isn't a translatable message.
 * @public
 */
// GENERATED CODE -- DO NOT EDIT!

var jspb = require('google-protobuf');
var goog = jspb;
var global = Function('return this')();

goog.exportSymbol('proto.peer.HandshakeMessage', null, global);
goog.exportSymbol('proto.peer.PeerInfoMessage', null, global);
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.peer.HandshakeMessage = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, null, null);
};
goog.inherits(proto.peer.HandshakeMessage, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.peer.HandshakeMessage.displayName = 'proto.peer.HandshakeMessage';
}
/**
 * Generated by JsPbCodeGenerator.
 * @param {Array=} opt_data Optional initial data array, typically from a
 * server response, or constructed directly in Javascript. The array is used
 * in place and becomes part of the constructed object. It is not cloned.
 * If no data is provided, the constructed object will be empty, but still
 * valid.
 * @extends {jspb.Message}
 * @constructor
 */
proto.peer.PeerInfoMessage = function(opt_data) {
  jspb.Message.initialize(this, opt_data, 0, -1, proto.peer.PeerInfoMessage.repeatedFields_, null);
};
goog.inherits(proto.peer.PeerInfoMessage, jspb.Message);
if (goog.DEBUG && !COMPILED) {
  /**
   * @public
   * @override
   */
  proto.peer.PeerInfoMessage.displayName = 'proto.peer.PeerInfoMessage';
}



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.peer.HandshakeMessage.prototype.toObject = function(opt_includeInstance) {
  return proto.peer.HandshakeMessage.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.peer.HandshakeMessage} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.peer.HandshakeMessage.toObject = function(includeInstance, msg) {
  var f, obj = {
    targetPubKey: msg.getTargetPubKey_asB64(),
    requestingPubKey: msg.getRequestingPubKey_asB64(),
    message: msg.getMessage_asB64(),
    responsePeerInfo: msg.getResponsePeerInfo_asB64()
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.peer.HandshakeMessage}
 */
proto.peer.HandshakeMessage.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.peer.HandshakeMessage;
  return proto.peer.HandshakeMessage.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.peer.HandshakeMessage} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.peer.HandshakeMessage}
 */
proto.peer.HandshakeMessage.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setTargetPubKey(value);
      break;
    case 2:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setRequestingPubKey(value);
      break;
    case 3:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setMessage(value);
      break;
    case 4:
      var value = /** @type {!Uint8Array} */ (reader.readBytes());
      msg.setResponsePeerInfo(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.peer.HandshakeMessage.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.peer.HandshakeMessage.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.peer.HandshakeMessage} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.peer.HandshakeMessage.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getTargetPubKey_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      1,
      f
    );
  }
  f = message.getRequestingPubKey_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      2,
      f
    );
  }
  f = message.getMessage_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      3,
      f
    );
  }
  f = message.getResponsePeerInfo_asU8();
  if (f.length > 0) {
    writer.writeBytes(
      4,
      f
    );
  }
};


/**
 * optional bytes target_pub_key = 1;
 * @return {!(string|Uint8Array)}
 */
proto.peer.HandshakeMessage.prototype.getTargetPubKey = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * optional bytes target_pub_key = 1;
 * This is a type-conversion wrapper around `getTargetPubKey()`
 * @return {string}
 */
proto.peer.HandshakeMessage.prototype.getTargetPubKey_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getTargetPubKey()));
};


/**
 * optional bytes target_pub_key = 1;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getTargetPubKey()`
 * @return {!Uint8Array}
 */
proto.peer.HandshakeMessage.prototype.getTargetPubKey_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getTargetPubKey()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.peer.HandshakeMessage} returns this
 */
proto.peer.HandshakeMessage.prototype.setTargetPubKey = function(value) {
  return jspb.Message.setProto3BytesField(this, 1, value);
};


/**
 * optional bytes requesting_pub_key = 2;
 * @return {!(string|Uint8Array)}
 */
proto.peer.HandshakeMessage.prototype.getRequestingPubKey = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 2, ""));
};


/**
 * optional bytes requesting_pub_key = 2;
 * This is a type-conversion wrapper around `getRequestingPubKey()`
 * @return {string}
 */
proto.peer.HandshakeMessage.prototype.getRequestingPubKey_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getRequestingPubKey()));
};


/**
 * optional bytes requesting_pub_key = 2;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getRequestingPubKey()`
 * @return {!Uint8Array}
 */
proto.peer.HandshakeMessage.prototype.getRequestingPubKey_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getRequestingPubKey()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.peer.HandshakeMessage} returns this
 */
proto.peer.HandshakeMessage.prototype.setRequestingPubKey = function(value) {
  return jspb.Message.setProto3BytesField(this, 2, value);
};


/**
 * optional bytes message = 3;
 * @return {!(string|Uint8Array)}
 */
proto.peer.HandshakeMessage.prototype.getMessage = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * optional bytes message = 3;
 * This is a type-conversion wrapper around `getMessage()`
 * @return {string}
 */
proto.peer.HandshakeMessage.prototype.getMessage_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getMessage()));
};


/**
 * optional bytes message = 3;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getMessage()`
 * @return {!Uint8Array}
 */
proto.peer.HandshakeMessage.prototype.getMessage_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getMessage()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.peer.HandshakeMessage} returns this
 */
proto.peer.HandshakeMessage.prototype.setMessage = function(value) {
  return jspb.Message.setProto3BytesField(this, 3, value);
};


/**
 * optional bytes response_peer_info = 4;
 * @return {!(string|Uint8Array)}
 */
proto.peer.HandshakeMessage.prototype.getResponsePeerInfo = function() {
  return /** @type {!(string|Uint8Array)} */ (jspb.Message.getFieldWithDefault(this, 4, ""));
};


/**
 * optional bytes response_peer_info = 4;
 * This is a type-conversion wrapper around `getResponsePeerInfo()`
 * @return {string}
 */
proto.peer.HandshakeMessage.prototype.getResponsePeerInfo_asB64 = function() {
  return /** @type {string} */ (jspb.Message.bytesAsB64(
      this.getResponsePeerInfo()));
};


/**
 * optional bytes response_peer_info = 4;
 * Note that Uint8Array is not supported on all browsers.
 * @see http://caniuse.com/Uint8Array
 * This is a type-conversion wrapper around `getResponsePeerInfo()`
 * @return {!Uint8Array}
 */
proto.peer.HandshakeMessage.prototype.getResponsePeerInfo_asU8 = function() {
  return /** @type {!Uint8Array} */ (jspb.Message.bytesAsU8(
      this.getResponsePeerInfo()));
};


/**
 * @param {!(string|Uint8Array)} value
 * @return {!proto.peer.HandshakeMessage} returns this
 */
proto.peer.HandshakeMessage.prototype.setResponsePeerInfo = function(value) {
  return jspb.Message.setProto3BytesField(this, 4, value);
};



/**
 * List of repeated fields within this message type.
 * @private {!Array<number>}
 * @const
 */
proto.peer.PeerInfoMessage.repeatedFields_ = [2];



if (jspb.Message.GENERATE_TO_OBJECT) {
/**
 * Creates an object representation of this proto.
 * Field names that are reserved in JavaScript and will be renamed to pb_name.
 * Optional fields that are not set will be set to undefined.
 * To access a reserved field use, foo.pb_<name>, eg, foo.pb_default.
 * For the list of reserved names please see:
 *     net/proto2/compiler/js/internal/generator.cc#kKeyword.
 * @param {boolean=} opt_includeInstance Deprecated. whether to include the
 *     JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @return {!Object}
 */
proto.peer.PeerInfoMessage.prototype.toObject = function(opt_includeInstance) {
  return proto.peer.PeerInfoMessage.toObject(opt_includeInstance, this);
};


/**
 * Static version of the {@see toObject} method.
 * @param {boolean|undefined} includeInstance Deprecated. Whether to include
 *     the JSPB instance for transitional soy proto support:
 *     http://goto/soy-param-migration
 * @param {!proto.peer.PeerInfoMessage} msg The msg instance to transform.
 * @return {!Object}
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.peer.PeerInfoMessage.toObject = function(includeInstance, msg) {
  var f, obj = {
    pubKey: jspb.Message.getFieldWithDefault(msg, 1, ""),
    addressesList: (f = jspb.Message.getRepeatedField(msg, 2)) == null ? undefined : f,
    connectedAddr: jspb.Message.getFieldWithDefault(msg, 3, "")
  };

  if (includeInstance) {
    obj.$jspbMessageInstance = msg;
  }
  return obj;
};
}


/**
 * Deserializes binary data (in protobuf wire format).
 * @param {jspb.ByteSource} bytes The bytes to deserialize.
 * @return {!proto.peer.PeerInfoMessage}
 */
proto.peer.PeerInfoMessage.deserializeBinary = function(bytes) {
  var reader = new jspb.BinaryReader(bytes);
  var msg = new proto.peer.PeerInfoMessage;
  return proto.peer.PeerInfoMessage.deserializeBinaryFromReader(msg, reader);
};


/**
 * Deserializes binary data (in protobuf wire format) from the
 * given reader into the given message object.
 * @param {!proto.peer.PeerInfoMessage} msg The message object to deserialize into.
 * @param {!jspb.BinaryReader} reader The BinaryReader to use.
 * @return {!proto.peer.PeerInfoMessage}
 */
proto.peer.PeerInfoMessage.deserializeBinaryFromReader = function(msg, reader) {
  while (reader.nextField()) {
    if (reader.isEndGroup()) {
      break;
    }
    var field = reader.getFieldNumber();
    switch (field) {
    case 1:
      var value = /** @type {string} */ (reader.readString());
      msg.setPubKey(value);
      break;
    case 2:
      var value = /** @type {string} */ (reader.readString());
      msg.addAddresses(value);
      break;
    case 3:
      var value = /** @type {string} */ (reader.readString());
      msg.setConnectedAddr(value);
      break;
    default:
      reader.skipField();
      break;
    }
  }
  return msg;
};


/**
 * Serializes the message to binary data (in protobuf wire format).
 * @return {!Uint8Array}
 */
proto.peer.PeerInfoMessage.prototype.serializeBinary = function() {
  var writer = new jspb.BinaryWriter();
  proto.peer.PeerInfoMessage.serializeBinaryToWriter(this, writer);
  return writer.getResultBuffer();
};


/**
 * Serializes the given message to binary data (in protobuf wire
 * format), writing to the given BinaryWriter.
 * @param {!proto.peer.PeerInfoMessage} message
 * @param {!jspb.BinaryWriter} writer
 * @suppress {unusedLocalVariables} f is only used for nested messages
 */
proto.peer.PeerInfoMessage.serializeBinaryToWriter = function(message, writer) {
  var f = undefined;
  f = message.getPubKey();
  if (f.length > 0) {
    writer.writeString(
      1,
      f
    );
  }
  f = message.getAddressesList();
  if (f.length > 0) {
    writer.writeRepeatedString(
      2,
      f
    );
  }
  f = message.getConnectedAddr();
  if (f.length > 0) {
    writer.writeString(
      3,
      f
    );
  }
};


/**
 * optional string pub_key = 1;
 * @return {string}
 */
proto.peer.PeerInfoMessage.prototype.getPubKey = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 1, ""));
};


/**
 * @param {string} value
 * @return {!proto.peer.PeerInfoMessage} returns this
 */
proto.peer.PeerInfoMessage.prototype.setPubKey = function(value) {
  return jspb.Message.setProto3StringField(this, 1, value);
};


/**
 * repeated string addresses = 2;
 * @return {!Array<string>}
 */
proto.peer.PeerInfoMessage.prototype.getAddressesList = function() {
  return /** @type {!Array<string>} */ (jspb.Message.getRepeatedField(this, 2));
};


/**
 * @param {!Array<string>} value
 * @return {!proto.peer.PeerInfoMessage} returns this
 */
proto.peer.PeerInfoMessage.prototype.setAddressesList = function(value) {
  return jspb.Message.setField(this, 2, value || []);
};


/**
 * @param {string} value
 * @param {number=} opt_index
 * @return {!proto.peer.PeerInfoMessage} returns this
 */
proto.peer.PeerInfoMessage.prototype.addAddresses = function(value, opt_index) {
  return jspb.Message.addToRepeatedField(this, 2, value, opt_index);
};


/**
 * Clears the list making it empty but non-null.
 * @return {!proto.peer.PeerInfoMessage} returns this
 */
proto.peer.PeerInfoMessage.prototype.clearAddressesList = function() {
  return this.setAddressesList([]);
};


/**
 * optional string connected_addr = 3;
 * @return {string}
 */
proto.peer.PeerInfoMessage.prototype.getConnectedAddr = function() {
  return /** @type {string} */ (jspb.Message.getFieldWithDefault(this, 3, ""));
};


/**
 * @param {string} value
 * @return {!proto.peer.PeerInfoMessage} returns this
 */
proto.peer.PeerInfoMessage.prototype.setConnectedAddr = function(value) {
  return jspb.Message.setProto3StringField(this, 3, value);
};


goog.object.extend(exports, proto.peer);
