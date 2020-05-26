import through from 'through';
import zlib from 'zlib';
import util from 'util';
import os from 'os';

import { spawn } from 'child_process'

import { HttpDuplex } from './http-duplex'

const headerRE = {
  'receive-pack': '([0-9a-fA-F]+) ([0-9a-fA-F]+) refs\/(heads|tags)\/(.*?)( |00|\u0000)|^(0000)$', // eslint-disable-line
  'upload-pack': '^\\S+ ([0-9a-fA-F]+)'
};

const packSideband = s => {
  const n = (4 + s.length).toString(16);
  return Array(4 - n.length + 1).join('0') + n + s;
};

export class Service extends HttpDuplex {
  status: string;
  repo: any;
  service: any;
  cwd: any;
  logs: any[];
  username: string | undefined;
  last: string;
  commit: string;
  evName: string;
  /**
   * Handles invoking the git-*-pack binaries
   * @class Service
   * @extends HttpDuplex
   * @param  {Object}               opts - options to bootstrap the service object
   * @param  {http.IncomingMessage }   req  - http request object
   * @param  {http.ServerResponse}  res  - http response
   */
  constructor(opts, req, res) {
    super(req, res);

    let data = '';
    let self = this;

    this.status = 'pending';
    this.repo = opts.repo;
    this.service = opts.service;
    this.cwd = opts.cwd;
    this.logs = [];

    var buffered = through().pause();

    // stream needed to receive data after decoding, but before accepting
    var ts = through();

    var decoder = {
        'gzip': () => zlib.createGunzip(),
        'deflate': () => zlib.createDeflate()
    }[req.headers['content-encoding']];

    if (decoder) {
        // data is compressed with gzip or deflate
        req.pipe(decoder()).pipe(ts).pipe(buffered);
    } else {
        // data is not compressed
        req.pipe(ts).pipe(buffered);
    }

    if(req.headers["authorization"]) {
      const tokens = req.headers["authorization"].split(" ");
      if (tokens[0] === "Basic") {
          const splitHash = Buffer.from(tokens[1], 'base64').toString('utf8').split(":");
          this.username = splitHash.shift();
      }
    }

    ts.once('data', function onData(buf) {
        data += buf;

        var ops = data.match(new RegExp(headerRE[self.service], 'gi'));
        if (!ops) return;
        data = '';

        ops.forEach(function(op) {
            let type;
            let m = op.match(new RegExp(headerRE[self.service]));

            if (self.service === 'receive-pack' && m !== null) {
                self.last = m[1];
                self.commit = m[2];

                if (m[3] == 'heads') {
                    type = 'branch';
                    self.evName = 'push';
                } else {
                    type = 'version';
                    self.evName = 'tag';
                }

                var headers = {
                    last: self.last,
                    commit: self.commit
                };
                headers[type] = self[type] = m[4];
                self.emit('header', headers);
            } else if (self.service === 'upload-pack' && m !== null) {
                self.commit = m[1];
                self.evName = 'fetch';
                self.emit('header', {
                    commit: self.commit
                });
            }
        });
    });

    self.once('accept', function onAccept() {
        process.nextTick(function() {
            const cmd = os.platform() == 'win32' ?
              ['git', opts.service, '--stateless-rpc', opts.cwd]
            :
              ['git-' + opts.service, '--stateless-rpc', opts.cwd];

            const ps = spawn(cmd[0], cmd.slice(1));

            ps.on('error', function(err) {
              self.emit('error', new Error(`${err.message} running command ${cmd.join(' ')}`));
            });

            self.emit('service', ps);

            var respStream = through(function write(c) {
                if (self.listeners('response').length === 0) {
                  if(self.logs.length > 0) {
                    while(self.logs.length > 0) {
                      this.queue(self.logs.pop());
                    }
                  }

                  return this.queue(c);
                }
                // prevent git from sending the close signal
                if (c.length === 4 && c.toString() === '0000') return;
                this.queue(c);
            }, function end() {
                if (self.listeners('response').length > 0) return;

                this.queue(null);
            });

            // respStream.log = function() {
            //   self.log();
            // };

            self.emit('response', respStream, function endResponse() {
                res.queue(Buffer.from('0000'));
                res.queue(null);
            });

            ps.stdout.pipe(respStream).pipe(res);

            buffered.pipe(ps.stdin);
            buffered.resume();

            ps.on('exit', () => {
              if(self.logs.length > 0) {
                while(self.logs.length > 0) {
                  respStream.queue(self.logs.pop());
                }
                respStream.queue(Buffer.from('0000'));
                respStream.queue(null);
              }

              self.emit.bind(self, 'exit');
            });
        });
    });

    self.once('reject', function onReject(code, msg) {
        res.statusCode = code;
        res.end(msg);
    });
  }

  log() {
    const _log = util.format(2, ...arguments);
    const SIDEBAND = String.fromCharCode(2); // PROGRESS
    const message = `${SIDEBAND}${_log}\n`;
    const formattedMessage = Buffer.from(packSideband(message));

    this.logs.unshift(formattedMessage);
  }
  /**
   * reject request in flight
   * @method reject
   * @memberof Service
   * @param  {Number} code - http response code
   * @param  {String} msg  - message that should be displayed on teh client
   */
  reject(code, msg) {
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
  accept() {
      if (this.status !== 'pending') return;

      this.status = 'accepted';
      this.emit('accept');
  }
}

