import { EventEmitter } from "events";
import http from 'http'
import through from 'through';
import zlib from 'zlib';
import fs from 'fs'
import { PassThrough } from "stream";
import { packObjectsWrapper } from "./packObjects/commands/packObjects";
import { muxJsWrapper } from "./packObjects/models/GitSideBand";

const headerRE = {
  'receive-pack': '([0-9a-fA-F]+) ([0-9a-fA-F]+) refs\/(heads|tags)\/(.*?)( |00|\u0000)|^(0000)$', // eslint-disable-line
  'upload-pack': '^\\S+ ([0-9a-fA-F]+)'
};


export class HttpDuplex extends EventEmitter {
  req: http.IncomingMessage
  res: http.ServerResponse

  status: string = 'pending';
  repo: string;
  service: string;
  cwd: string;
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

    if (isServiceDuplex) {
      this.repo = repo!
      this.service = service!
      this.cwd = cwd!


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

      if (req.headers["authorization"]) {
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

  // As far as I understand it, this was originally used for accumulating data
  // on the request stream
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
        headers[type] = this[type] = m[4];
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

    // const cmd = os.platform() == 'win32' ?
    //   ['git', this.service, '--stateless-rpc', this.cwd]
    // :
    //   ['git-' + this.service, '--stateless-rpc', this.cwd];

    // const ps = spawn(cmd[0], cmd.slice(1));

    // ps.on('error', function(err) {
    //   this.emit('error', new Error(`${err.message} running command ${cmd.join(' ')}`));
    // });

    // const respStream = through(function write(c) {
    //   return this.queue(c);
    // }, function end() {
    //   if (this.listeners('response').length > 0) return;

    //   this.queue(null);
    // });

    // ps.stdout.pipe(respStream).pipe(this.res);















    this.buffered.on('data', async (data) => {
      console.log('===========from============');
      console.log('I got data from client');
      console.log(data.toString());

      if (data.toString().slice(4, 8) == 'want') {
        const wantedObjectId = data.toString().slice(9, 49)
        console.log('wantedObjectId');
        console.log(wantedObjectId);

        const repoDir = this.cwd

        const packResult = await packObjectsWrapper({
          fs: fs,
          dir: repoDir,
          refs: [wantedObjectId],
          depth: undefined
        })
        // console.log('packResult.shallows');
        // console.log(packResult.shallows);
        // console.log('packResult.unshallows');
        // console.log(packResult.unshallows);

        // packResult.packstream.on('data', (data) => {
        //   console.log('packstream!');
        //   console.log(data.toString());
        // })
        this.res.write(Buffer.from('0008NAK\n'))

        // // This works for cloning straight up:
        // packResult.packstream.pipe(this.res)

        // This is to get the side band stuff working
        const readable = new PassThrough()
        const sideBand = muxJsWrapper(
          'side-band-64',
          readable,
          packResult.packstream,
          [],
          []
        )
        sideBand.pipe(this.res)
        sideBand.on('data', (data) => {
          console.log('sideBand!');
          console.log(data.toString());
        })
      }
    })

    // Uncomment this line to use the spawn child process (native git cli)
    // this.buffered.pipe(ps.stdin);
    this.buffered.resume();

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
    this.ts.emit('reject', code || 500, msg);
  }

  /**
   * accepts request to access resource
   * @method accept
   * @memberof Service
   */
  accept(): void {
    if (this.status !== 'pending') return;

    this.status = 'accepted';
    this.ts.emit('accept');
  }

  destroy() {
    this.req.destroy();
    this.res.destroy();
  }
}
