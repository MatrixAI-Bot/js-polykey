import { EncryptedFS } from "encryptedfs";
import Path from 'path'
import git from 'isomorphic-git'
import { parse } from 'querystring'
import http from 'http'
import https from 'https'
import url from 'url'
import { HttpDuplex } from "./HttpDuplex";
import { EventEmitter } from "events";
import { uploadPack } from "../git-server/isogit/upload-pack/uploadPack";
import { spawn } from "child_process";
import { promisify } from "util";
import fs from 'fs'
import VaultStore from "@polykey/VaultStore/VaultStore";
import { Readable } from "stream";


const services = ['upload-pack', 'receive-pack']

class GitBackend extends EventEmitter {
  repoDir: string;
  vaultStore: VaultStore;
  autoCreate = false
  server: http.Server;
  constructor(
    repoDir: string,
    vaultStore: VaultStore
  ) {
    super()

    this.repoDir = repoDir
    this.vaultStore = vaultStore
  }

  /**
   * Get a list of all the repositories
   * @method list
   * @memberof Git
   * @param  {Function} callback function to be called when repositories have been found `function(error, repos)`
   */
  async list(): Promise<string[]> {
    return (fs.readdirSync(this.repoDir)).filter((r) =>  {
      // TODO: Filter just directories
      // TODO: Filter only the vaults that have been shared
      return r
    })
  }

  /**
   * Find out whether `repoName` exists in the callback `cb(exists)`.
   * @method exists
   * @memberof Git
   * @param  {String}   repo - name of the repo
   * @param  {Function=} callback - function to be called when finished
   */
  async exists(repo: string) {
    // TODO: consider if vault has been shared
    return fs.existsSync(Path.join(this.repoDir, repo))
  }

  /**
   * Create a subdirectory `dir` in the repo dir with a callback `cb(err)`.
   * @method mkdir
   * @memberof Git
   * @param  {String}   dir - directory name
   * @param  {Function=} callback  - callback to be called when finished
   */
  mkdir(dir: string) {
    // TODO: remove sync operations
    const parts = Path.join(this.repoDir, dir).split(Path.sep)
    for (let i = 0; i <= parts.length; i++) {
      const directory = parts.slice(0, i).join(Path.sep)
      if (directory && !fs.existsSync(directory)) {
        fs.mkdirSync(directory)
      }
    }
  }

  /**
   * Create a new bare repository `repoName` in the instance repository directory.
   * @method create
   * @memberof Git
   * @param  {String}   repo - the name of the repo
   * @param  {Function=} callback - Optionally get a callback `cb(err)` to be notified when the repository was created.
   */
  async create(repo: string) {
    if (!/\.git$/.test(repo)) {
      repo += '.git'
    }

    if (this.exists(repo)) {
      this.mkdir(repo)
    }

    const dir = Path.join(this.repoDir, repo)
    const fileSystem = fs
    // const fileSystem = this.vaultStore.get(repo)!.efs
    try {
      await git.init({
        fs: fileSystem,
        dir: dir
      })
    } catch (err) {
      throw (err)
    }
  }

  /**
   * returns the typeof service being process
   * @method getType
   * @param  {String} service - the service type
   * @return {String}  - will respond with either upload or download
   */
  getType(service: any): string {
    switch (service) {
      case 'upload-pack':
        return 'fetch'
      case 'receive-pack':
        return 'push'
      default:
        return 'unknown'
    }
  }


  // alternatively you can also pass authenticate a promise
  async authenticate(
    type: string,
    repo: string,
    username: string,
    password: string,
    headers: http.IncomingHttpHeaders
  ) {
    console.log(type, repo, username, password)
    if(username === 'foo') {
      return
    }
    throw(Error("sorry you don't have access to this content"))
  }

  /**
   * Handle incoming HTTP requests with a connect-style middleware
   * @method handle
   * @memberof Git
   * @param  {Object} req - http request object
   * @param  {Object} res - http response object
   */
  handle(req: http.IncomingMessage, res: http.ServerResponse) {
    const handler1 = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (req.method !== 'GET') return false

      const u = url.parse(req.url!)
      const m = u.pathname!.match(/\/(.+)\/info\/refs$/)
      if (!m) return false
      if (/\.\./.test(m[1])) return false

      const repo = m[1]
      const params = parse(u.query!)
      if (!params.service) {
        res.statusCode = 400
        res.end('service parameter required')
        return
      }

      const service = (<string>params.service).replace(/^git-/, '')
      if (services.indexOf(service) < 0) {
        res.statusCode = 405
        res.end('service not available')
        return
      }

      const repoName = this.parseGitName(m[1])

      // // check if the repo is authenticated
      // if (!req.headers["authorization"]) {
      //   res.setHeader("Content-Type", 'text/plain')
      //   res.setHeader("WWW-Authenticate", 'Basic realm="authorization needed"')
      //   res.writeHead(401)
      //   res.end('401 Unauthorized')
      // } else {
      //   const tokens = req.headers["authorization"].split(" ")
      //   if (tokens[0] === "Basic") {
      //     const splitHash = Buffer.from(tokens[1], 'base64').toString('utf8').split(":")
      //     const username = splitHash.shift() ?? ""
      //     const password = splitHash.join(":")
      //     // try to authenticate
      //     try {
      //       this.authenticate(this.getType(service), repoName, username, password, req.headers)
      //     } catch (error) {
      //       res.setHeader("Content-Type", 'text/plain')
      //       res.setHeader("WWW-Authenticate", 'Basic realm="authorization needed"')
      //       res.writeHead(401)
      //       res.end(typeof error === 'string' ? error : error.toString())
      //       return
      //     }
      //   }
      // }

      return this.infoResponse(repo, service, req, res)
    }
    const handler2 = async (req: http.IncomingMessage, res: http.ServerResponse) => {
      if (req.method !== 'GET') return false

      const u = url.parse(req.url!)
      const m = u.pathname!.match(/^\/(.+)\/HEAD$/)
      if (!m) return false
      if (/\.\./.test(m[1])) return false

      const repo = m[1]

      const next = async () => {
        const fileSystem = fs
        // const fileSystem = this.vaultStore.get(repo)!.efs

        const file = Path.join(this.repoDir, m[1], 'HEAD')
        const exists = await this.exists(file)
        if (exists) {
          fileSystem.createReadStream(file, {}).pipe(res)
        } else {
          res.statusCode = 404
          res.end('not found')
        }
      }

      const exists = await this.exists(repo)
      const anyListeners = this.listeners('head').length > 0
      const dup = new HttpDuplex(req, res)
      // dup.exists = exists
      dup.repo = repo
      dup.cwd = Path.join(this.repoDir, repo)

      dup.accept = dup.emit.bind(dup, 'accept')
      dup.reject = dup.emit.bind(dup, 'reject')

      dup.once('reject', (code) => {
        dup.statusCode = code || 500
        res.end()
      })

      if (!exists && this.autoCreate) {
        dup.once('accept', (dir) => {
          this.create(dir || repo)
          next()
        })
        this.emit('head', dup)
        if (!anyListeners) dup.accept()
      } else if (!exists) {
        res.statusCode = 404
        res.setHeader('content-type', 'text/plain')
        res.end('repository not found')
      } else {
        dup.once('accept', next)
        this.emit('head', dup)
        if (!anyListeners) dup.accept()
      }
    }
    const handler3 = (req: http.IncomingMessage, res: http.ServerResponse) => {
      console.log('res3');
      if (req.method !== 'POST') return false
      const m = req.url!.match(/\/(.+)\/git-(.+)/)
      if (!m) return false
      if (/\.\./.test(m[1])) return false

      const repo = m[1]
      const service = m[2]

      if (services.indexOf(service) < 0) {
        res.statusCode = 405
        res.end('service not available')
        return
      }

      res.setHeader('content-type', 'application/x-git-' + service + '-result')
      this.noCache(res)

      const action = this.createAction(req, res, repo, service, Path.join(this.repoDir, repo))

      action.on('header', () => {
        const evName = action.evName
        const anyListeners = this.listeners(evName).length > 0
        this.emit(evName, action)
        if (!anyListeners) action.accept()
      })
    }
    const handler4 = (req: http.IncomingMessage, res: http.ServerResponse) => {
      console.log('res4');
      if (req.method !== 'GET' && req.method !== 'POST') {
        res.statusCode = 405
        res.end('method not supported')
      } else {
        return false
      }
    }
    const handler5 = (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.statusCode = 404
      res.end('not found')
    }

    const handlers = [
      handler1,
      handler2,
      handler3,
      handler4,
      handler5
    ]

    res.setHeader('connection', 'close')

    const next = (ix, self) => {
      const done = () => {
        next(ix + 1, self)
      }
      const x = handlers[ix].call(self, req, res, done)
      if (x === false) next(ix + 1, self)
    }

    next(0, this)
  }

  /**
   * starts a git server on the given port
   * @method listen
   * @memberof Git
   * @param  {Number}   port     - the port to start the server on
   * @param  {Object=}   options  - the options to add extended functionality to the server
   * @param  {String=}   options.type - this is either https or http (the default is http)
   * @param  {Buffer|String=}   options.key - the key file for the https server
   * @param  {Buffer|String=}   options.cert - the cert file for the https server
   * @param  {Function} callback - the function to call when server is started or error has occured
   * @return {Git}  - the Git instance, useful for chaining
   */
  listen(port: number, type: 'http' | 'https' = 'http'): GitBackend {
    if (type == 'http') {
      this.server = http.createServer((req, res) => {
        this.handle(req, res)
      })
    } else {
      this.server = https.createServer((req, res) => {
        this.handle(req, res)
      })
    }

    this.server.listen(port, () => {
      console.log(`node-git-server running at http://localhost:${port}`)
    })
    return this
  }

  /**
   * closes the server instance
   * @method close
   * @memberof Git
   * @param {Promise} - will resolve or reject when the server closes or fails to close.
   */
  async close() {
    try {
      await promisify(this.server.close)()
    } catch (error) {
      throw(error)
    }
  }









  // ============ Helper functions ============ //
  /**
   * parses a git string and returns the repo name
   * @method parseGitName
   * @param  {String}     repo - the raw repo name containing .git
   * @return {String}     returns the name of the repo
   */
  parseGitName(repo: string): string {
    const locationOfGit = repo.lastIndexOf('.git')
    return repo.substr(0, locationOfGit > 0 ? locationOfGit : repo.length)
  }


  /**
   * sends http response using the appropriate output from service call
   * @method infoResponse
   * @param  {Git}        git     - an instance of git object
   * @param  {String}     repo    - the repository
   * @param  {String}     service - the method that is responding infoResponse (push, pull, clone)
   * @param  {http.IncomingMessage }   req  - http request object
   * @param  {http.ServerResponse}  res  - http response
   */
  infoResponse(repo: string, service: string, req: http.IncomingMessage, res: http.ServerResponse) {
    const repoPath = Path.join(this.repoDir, repo)

    const dup = new HttpDuplex(req, res)
    dup.cwd = repoPath
    dup.repo = repo

    dup.accept = dup.emit.bind(dup, 'accept')
    dup.reject = dup.emit.bind(dup, 'reject')

    dup.once('reject', (code) => {
      res.statusCode = code || 500
      res.end()
    })

    const anyListeners = this.listeners('info').length > 0

    const next = () => {

      res.setHeader(
        'content-type',
        'application/x-git-' + service + '-advertisement'
      )
      this.noCache(res)

      this.serviceRespond(
        service,
        repo,
        repoPath,
        res
      )
    }

    this.exists(repo).then((exists) => {
      // dup.exists = exists

      if (!exists && this.autoCreate) {
        dup.once('accept', () => {
          this.create(repo)
          next()
        })

        this.emit('info', dup)
        if (!anyListeners) dup.accept()
      } else if (!exists) {
        res.statusCode = 404
        res.setHeader('content-type', 'text/plain')
        res.end('repository not found')
      } else {
        dup.once('accept', next)
        this.emit('info', dup)

        if (!anyListeners) dup.accept()
      }
    })

  }

  /**
   * adds headers to the response object to add cache control
   * @method noCache
   * @param  {http.ServerResponse}  res  - http response
   */
  noCache(res: http.ServerResponse) {
    res.setHeader('expires', 'Fri, 01 Jan 1980 00:00:00 GMT')
    res.setHeader('pragma', 'no-cache')
    res.setHeader('cache-control', 'no-cache, max-age=0, must-revalidate')
  }


  /**
   * execute given git operation and respond
   * @method serviceRespond
   * @param  {HttpDuplex}   dup          - duplex object to catch errors
   * @param  {String}       service      - the method that is responding infoResponse (push, pull, clone)
   * @param  {String}       repoLocation - the repo path on disk
   * @param  {http.ServerResponse}  res  - http response
   */
  serviceRespond(service: string, repo: string, repoLocation: string, res: http.ServerResponse) {

    const pack = (s) => {
      var n = (4 + s.length).toString(16)
      return Array(4 - n.length + 1).join('0') + n + s
    }

    res.write(pack('# service=git-' + service + '\n'))
    res.write('0000')

    var cmd: any[]
    var isWin = /^win/.test(process.platform)
    if (isWin) {
      cmd = ['git', service, '--stateless-rpc', '--advertise-refs', repoLocation]
    } else {
      cmd = ['git-' + service, '--stateless-rpc', '--advertise-refs', repoLocation]
    }

    console.log(cmd);

    const fileSystem = fs
    // const fileSystem = this.vaultStore.get(repo)!.efs

    // Create packed-refs file
    fileSystem.writeFileSync(
      Path.join(repoLocation, '.git', 'packed-refs'),
      "# pack-refs with: peeled fully-peeled sorted\n"
    )

    uploadPack({
      fs: fileSystem,
      dir: repoLocation,
      advertiseRefs: true
    }).then((buffers) => {
      const buffersToWrite = buffers ?? []

      async function * generate() {

        yield buffersToWrite[0];
        yield buffersToWrite[1];
      }

      const readable = Readable.from(generate());
      readable.pipe(res)

      readable.on('data', (chunk) => {
        console.log(chunk.toString());
      });


      // if (buffers) {
      //   for (const buf of buffers) {
      //     res.write(buf)
      //   }
      // }
      // stream.pipe(res)

      // const next = (ix, next, err) => {
      //   if (err) {
      //     console.log("I failed!");
      //     console.log(err);
      //   } else {
      //     console.log("I didn't fail!");
      //   }
      //   const buf = buffersToWrite[ix]
      //   res.write(buf, (err) => {
      //     if (ix+1 < buffersToWrite.length){
      //       next(ix+1, next, err)
      //     } else {
      //       console.log('Finished!');
      //     }
      //   })
      // }
      // next(0, next, null)

    }).catch((e) => {
      console.log(e);
    })


    const ps = spawn(cmd[0], cmd.slice(1))

    // ps.on('error', (err) => {
    //   this.emit('error', new Error(`${err.message} running command ${cmd.join(' ')}`))
    // })
    // ps.stdout.pipe(res)

    const readable = Readable.from(ps.stdout);

    readable.on('data', (chunk) => {
      console.log('ps');

      console.log(chunk.toString());
    });
  }


  /**
   * responds with the correct service depending on the action
   * @method createAction
   * @param  {Object}     opts - options to pass Service
   * @param  {http.IncomingMessage }   req  - http request object
   * @param  {http.ServerResponse}  res  - http response
   * @return {Service}
   */
  createAction(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    repo: string,
    service: string,
    cwd: string
  ): HttpDuplex {
    return new HttpDuplex(
      req,
      res,
      true,
      repo,
      service,
      cwd
    )
  }
}

export default GitBackend
