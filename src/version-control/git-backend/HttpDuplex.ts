import { EventEmitter } from "events";
import http from 'http'
import through from 'through';
import zlib from 'zlib';
import util from 'util';
import os from 'os';
import { spawn } from "child_process";


const headerRE = {
  'receive-pack': '([0-9a-fA-F]+) ([0-9a-fA-F]+) refs\/(heads|tags)\/(.*?)( |00|\u0000)|^(0000)$', // eslint-disable-line
  'upload-pack': '^\\S+ ([0-9a-fA-F]+)'
};

const packSideband = s => {
  const n = (4 + s.length).toString(16);
  return Array(4 - n.length + 1).join('0') + n + s;
};

export class HttpDuplex extends EventEmitter {
  req: http.IncomingMessage
  res: http.ServerResponse

  status: string;
  repo: string;
  service: string;
  cwd: string;
  logs: Buffer[];
  username: string | undefined;
  last: string;
  commit: string;
  evName: string;

  data = '';

  buffered: through.ThroughStream
  ts: through.ThroughStream

  constructor(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    isServiceDuplex: boolean = false,
    repo?: string,
    service?: string,
    cwd?: string
  ) {
    super()

    this.req = req
    this.res = res


    // request / input proxy events
    const reqProxyEvents = ['data', 'end', 'error', 'close']
    for (const name of reqProxyEvents) {
      this.req.on(name, this.emit.bind(this, name));
    }

    // respone / output proxy events
    const resProxyEvents = ['data', 'end', 'error', 'close']
    for (const name of resProxyEvents) {
      this.res.on(name, this.emit.bind(this, name));
    }

    if (isServiceDuplex) {
      this.repo = repo!
      this.service = service!
      this.cwd = cwd!
      this.logs = []


      this.buffered = through().pause();
      this.ts = through();


      const contentEncoding = req.headers['content-encoding']

      let decoder: zlib.Gunzip | zlib.Deflate | null = null

      if (contentEncoding == 'gzip') {
        decoder = zlib.createGunzip()
      } else if (contentEncoding == 'deflate') {
        decoder = zlib.createDeflate()
      }

      if (decoder) {
        // data is compressed with gzip or deflate
        req.pipe(decoder).pipe(this.ts).pipe(this.buffered);
      } else {
        // data is not compressed
        req.pipe(this.ts).pipe(this.buffered);
      }

      if(req.headers["authorization"]) {
        const tokens = req.headers["authorization"].split(" ");
        if (tokens[0] === "Basic") {
          const splitHash = Buffer.from(tokens[1], 'base64').toString('utf8').split(":");
          this.username = splitHash.shift();
        }
      }

      this.ts.once('data', this.onData.bind(this))

      this.ts.once('accept', this.onAccept.bind(this))

      this.ts.once('reject', this.onReject.bind(this))
    }
  }


  log() {
    const _log = util.format(2, ...arguments);
    const SIDEBAND = String.fromCharCode(2); // PROGRESS
    const message = `${SIDEBAND}${_log}\n`;
    const formattedMessage = Buffer.from(packSideband(message));

    this.logs.unshift(formattedMessage);
  }

  onData(buf: Buffer) {
    this.data += buf;

    var ops = this.data.match(new RegExp(headerRE[this.service], 'gi'));
    if (!ops) return;

    this.data = '';

    for (const op of ops) {
      let type: string;
      let m = op.match(new RegExp(headerRE[this.service]));

      if (this.service === 'receive-pack' && m !== null) {
        this.last = m[1];
        this.commit = m[2];

        if (m[3] == 'heads') {
          type = 'branch';
          this.evName = 'push';
        } else {
          type = 'version';
          this.evName = 'tag';
        }

        const headers = {
          last: this.last,
          commit: this.commit
        };
        headers[type] = self[type] = m[4];
        this.emit('header', headers);
      } else if (this.service === 'upload-pack' && m !== null) {
        this.commit = m[1];
        this.evName = 'fetch';
        this.emit('header', {
          commit: this.commit
        });
      }
    }
  }

  async onAccept() {
    const cmd = os.platform() == 'win32' ?
      ['git', this.service, '--stateless-rpc', this.cwd]
    :
      ['git-' + this.service, '--stateless-rpc', this.cwd];

    const ps = spawn(cmd[0], cmd.slice(1));

    ps.on('error', function(err) {
      this.emit('error', new Error(`${err.message} running command ${cmd.join(' ')}`));
    });

    this.emit('service', ps);

    const respStream = through(function write(c) {
      if (this.listeners('response').length === 0) {
        if(this.logs.length > 0) {
          while(this.logs.length > 0) {
            this.queue(this.logs.pop());
          }
        }

        return this.queue(c);
      }
      // prevent git from sending the close signal
      if (c.length === 4 && c.toString() === '0000') return;
      this.queue(c);
    }.bind(this), function end() {
      if (this.listeners('response').length > 0) return;

      this.queue(null);
    }.bind(this));

    this.emit('response', respStream, function endResponse() {
      this.res.queue(Buffer.from('0000'));
      this.res.queue(null);
    }.bind(this));

    ps.stdout.pipe(respStream).pipe(this.res);

    this.buffered.pipe(ps.stdin);
    this.buffered.resume();

    ps.on('exit', () => {
      if(this.logs.length > 0) {
        while(this.logs.length > 0) {
          respStream.queue(this.logs.pop());
        }
        respStream.queue(Buffer.from('0000'));
        respStream.queue(null);
      }

      this.emit.bind(self, 'exit');
    });
  }

  onReject(code: number, msg: string) {
    this.res.statusCode = code;
    this.res.end(msg);
  }

  /**
   * reject request in flight
   * @method reject
   * @memberof Service
   * @param  {Number} code - http response code
   * @param  {String} msg  - message that should be displayed on teh client
   */
  reject(code: number, msg: string): void {
    if (this.status !== 'pending') return;

    if (msg === undefined && typeof code === 'string') {
      msg = code;
      code = 500;
    }
    this.status = 'rejected';
    this.emit('reject', code || 500, msg);
  }
  /**
   * accepts request to access resource
   * @method accept
   * @memberof Service
   */
  accept(): void {
    if (this.status !== 'pending') return;

    this.status = 'accepted';
    this.emit('accept');
  }

  // // input / request wrapping
  // get client() {
  //   return this.req.client;
  // }

  get complete() {
      return this.req.complete;
  }

  /**
    * Reference to the underlying socket for the request connection.
    * @type {net.Socket}
    * @readonly
    * @see {@link https://nodejs.org/api/http.html#http_request_socket|request.Socket}
    */
  get connection() {
      return this.req.connection;
  }

  /**
   * Request/response headers. Key-value pairs of header names and values. Header names are always lower-case.
   * @name headers
   * @alias HttpDuplex.headers
   * @memberof HttpDuplex
   * @type {Object}
   * @readonly
   * @see {@link https://nodejs.org/api/http.html#http_message_headers|message.headers}
   */
  get headers() {
      return this.req.headers;
  }

  /**
   * Requested HTTP Version sent by the client. Usually either '1.0' or '1.1'
   * @name httpVersion
   * @alias HttpDuplex.httpVersion
   * @memberof HttpDuplex
   * @type {String}
   * @see {@link https://nodejs.org/api/http.html#http_message_httpversion|message.httpVersion}
   * @readonly
   */
  get httpVersion() {
      return this.req.httpVersion;
  }

  /**
   * First integer in the httpVersion string
   * @name httpVersionMajor
   * @alias HttpDuplex.httpVersionMajor
   * @memberof HttpDuplex
   * @type {Number}
   * @see httpVersion
   * @readonly
   */
  get httpVersionMajor() {
      return this.req.httpVersionMajor;
  }

  /**
   * Second integer ni the httpVersion string
   * @name httpVersionMinor
   * @alias HttpDuplex.httpVersionMinor
   * @memberof HttpDuplex
   * @type {String}
   * @see httpVersion
   * @readonly
   */
  get httpVersionMinor() {
      return this.req.httpVersionMinor;
  }

  /**
    * Request method of the incoming request.
    * @type {String}
    * @see {@link https://nodejs.org/api/http.html#http_event_request|request}
    * @see {@link https://nodejs.org/api/http.html#http_class_http_serverresponse|http.ServerResponse}
    * @example 'GET', 'DELETE'
    * @readonly
    */
  get method() {
      return this.req.method;
  }

  /**
   * Is this stream readable.
   * @type {Boolean}
   * @readonly
   */
  get readable() {
      return this.req.readable;
  }

  /**
    * net.Socket object associated with the connection.
    * @type net.Socket
    * @see {@link https://nodejs.org/api/net.html#net_class_net_socket|net.Socket}
    * @readonly
    */
  get socket() {
      return this.req.socket;
  }

  /**
   * The HTTP status code. Generally assigned before sending headers for a response to a client.
   * @type {Number}
   * @default 200
   * @see {@link https://nodejs.org/api/http.html#http_response_statuscode|response.statusCode}
   * @example request.statusCode = 404;
   */
  get statusCode() {
      return this.res.statusCode;
  }

  set statusCode(val) {
      this.res.statusCode = val;
  }

  /**
   * Controls the status message sent to the client as long as an explicit call to response.writeHead() isn't made
   * If ignored or the value is undefined, the default message corresponding to the status code will be used.
   * @type {String}
   * @default undefined
   * @see {@link https://nodejs.org/api/http.html#http_response_statusmessage|response.statusMessage}
   * @example request.statusMessage = 'Document Not found';
   */
  get statusMessage() {
      return this.res.statusMessage;
  }

  set statusMessage(val) {
      this.res.statusMessage = val;
  }

  /**
   * Request/response trailer headers. Just like {@link headers} except these are only written
   * after the initial response to the client.
   * This object is only populated at the 'end' event and only work if a 'transfer-encoding: chunked'
   * header is sent in the initial response.
   * @name HttpDuplex#trailers
   * @type {Object}
   * @readonly
   * @see headers
   * @see addTrailers
   * @see {@link https://nodejs.org/api/http.html#http_message_trailers|message.trailers}
   * @see {@link https://nodejs.org/api/http.html#http_response_addtrailers_headers|response.addTrailers}
   */
  get trailers() {
      return this.req.trailers;
  }

  // /**
  //   * Whether or not the client connection has been upgraded
  //   * @type {Boolean}
  //   * @see {@link https://nodejs.org/api/http.html#http_event_upgrade_1|upgrade}
  //   * @readonly
  //   */
  // get upgrade() {
  //     return this.req.upgrade;
  // }

  /**
   * Request URL string.
   * @example <caption>A request made as:</caption>
   * GET /info?check=none HTTP/1.1
   * @example <caption>Will return the string</caption>
   * '/info?check=none'
   * @type {String}
   * @readonly
   */
  get url() {
      return this.req.url;
  }

  // output / response wrapping
  get writable() {
      return this.res.writable;
  }

  /**
   * Sends a response header to the client request. Must only be called one time and before calling response.end().
   * @method writeHead
   * @alias HttpDuplex.writeHead
   * @memberof HttpDuplex
   * @param {number} statusCode 3-digit HTTP status code, like 404
   * @param {string} [statusMessage] An optional human readable status message to send with the status code
   * @param {object} [headers] An object containing the response headers to send
   * @returns {this}
   * @see {@link https://nodejs.org/api/http.html#http_response_writehead_statuscode_statusmessage_headers|response.writeHead}
   * @example var content = 'Under Construction...';
   * response.writeHead(200, {
   *     'Content-Length': Buffer.byteLength(content),
   *     'Content-Type': 'text/plain'
   * });
   * response.end(content);
   */
  writeHead(statusCode: any, statusMessage: any, headers: any) {
      this.res.writeHead(statusCode, statusMessage, headers);
      return this;
  }

  /**
   * Buffers written data in memory. This data will be flushed when either the uncork or end methods are called.
   * @method cork
   * @alias HttpDuplex.cork
   * @memberof HttpDuplex
   * @returns {this}
   * @see uncork
   * @see {@link https://nodejs.org/api/stream.html#stream_writable_cork|stream.Writeable.cork}
   * @example
   * request.cork();
   * request.write('buffer data ');
   * request.write('before sending ');
   * request.uncork();
   */
  cork() {
      this.res.connection.cork();
      return this;
  }

  /**
   * Flushes all data buffered since cork() was called.
   * @method uncork
   * @alias HttpDuplex.cork
   * @memberof HttpDuplex
   * @returns {this}
   * @see cork
   * @see {@link https://nodejs.org/api/stream.html#stream_writable_uncork|stream.Writeable.uncork}
   */
  uncork() {
      this.res.connection.uncork();
      return this;
  }

  destroy() {
    this.req.destroy();
    this.res.destroy();
  }
}


// proxy request methods
['pause', 'resume', 'setEncoding'].forEach(function (name) {
  HttpDuplex.prototype[name] = function () {
      return this.req[name].apply(this.req, Array.from(arguments));
  };
});

// proxy respone methods
[
  'setDefaultEncoding', 'write', 'end', 'flush', 'writeHeader', 'writeContinue',
  'setHeader', 'getHeader', 'removeHeader', 'addTrailers'
].forEach(function (name) {
  HttpDuplex.prototype[name] = function () {
      return this.res[name].apply(this.res, Array.from(arguments));
  };
});
// HttpDuplex.prototype
// /**
// * Destroys object and it's bound streams
// * @method destroy
// * @alias HttpDuplex.destroy
// * @memberof HttpDuplex
// */
// HttpDuplex.prototype.destroy = function () {
//   this.req.destroy();
//   this.res.destroy();
// };
