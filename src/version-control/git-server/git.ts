import Path from 'path'
import http from 'http'
import https from 'https'
import url from 'url'
import { parse } from 'querystring'
import { HttpDuplex } from './http-duplex'

import git from 'isomorphic-git'
import gitHttp from 'isomorphic-git/http/web'

// import { spawn } from 'child_process'
import { EventEmitter } from 'events'

import { Util } from './util'
import { EncryptedFS } from 'encryptedfs'
import { GitFS } from '@polykey/util'

const services = ['upload-pack', 'receive-pack']

export class Git extends EventEmitter {
  authenticate: any
  autoCreate: boolean
  checkout: any
  server: any
  repoDir: string
  efs: GitFS
  /**
   *
   * Handles invoking the git-*-pack binaries
   * @class Git
   * @extends EventEmitter
   * @param  {(String|Function)}    repoDir   - Create a new repository collection from the directory `repoDir`. `repoDir` should be entirely empty except for git repo directories. If `repoDir` is a function, `repoDir(repo)` will be used to dynamically resolve project directories. The return value of `repoDir(repo)` should be a string path specifying where to put the string `repo`. Make sure to return the same value for `repo` every time since `repoDir(repo)` will be called multiple times.
   * @param  {Object}    options - options that can be applied on the new instance being created
   * @param  {Boolean=}  options.autoCreate - By default, repository targets will be created if they don't exist. You can
   disable that behavior with `options.autoCreate = true`
   * @param  {Function}  options.authenticate - a function that has the following arguments ({ type, repo, username, password, headers }, next) and will be called when a request comes through if set
   *
     authenticate: ({ type, repo, username, password, headers }, next) => {
       console.log(type, repo, username, password)
       next()
     }
     // alternatively you can also pass authenticate a promise
     authenticate: ({ type, repo, username, password, headers }, next) => {
       console.log(type, repo, username, password)
       return new Promise((resolve, reject) => {
        if(username === 'foo') {
          return resolve()
        }
        return reject("sorry you don't have access to this content")
       })
     }
   * @param  {Boolean=}  options.checkout - If `opts.checkout` is true, create and expected checked-out repos instead of bare repos
  */
  constructor(repoDir: string, efs: EncryptedFS, options: {
    autoCreate?: boolean,
    authenticate?: Function | null,
    checkout?: boolean
  } = { autoCreate: false, authenticate: null, checkout: false }) {
    super()

    this.repoDir = repoDir
    this.efs = efs
    this.authenticate = options.authenticate
    this.autoCreate = options.autoCreate ?? false
    this.checkout = options.checkout
  }

  dirMap(dir?: string) {
    return (Path.normalize(dir ? Path.join(this.repoDir, dir) : this.repoDir))
  }
  /**
   * Get a list of all the repositories
   * @method list
   * @memberof Git
   * @param  {Function} callback function to be called when repositories have been found `function(error, repos)`
   */
  list(callback: (err: any, repos: any) => void) {
    this.efs.readdir(this.dirMap(), {}, (results: any[]) => {
      let repos = results.filter((r) => {
        return r.substring(r.length - 3, r.length) == 'git'
      }, [])

      callback(null, repos)
    })
  }
  /**
   * Find out whether `repoName` exists in the callback `cb(exists)`.
   * @method exists
   * @memberof Git
   * @param  {String}   repo - name of the repo
   * @param  {Function=} callback - function to be called when finished
   */
  exists(repo: string, callback: (ex: any) => void) {
    console.log(this.dirMap(repo));

    const exists = this.efs.existsSync(this.dirMap(repo))
    callback(exists)
  }
  /**
   * Create a subdirectory `dir` in the repo dir with a callback `cb(err)`.
   * @method mkdir
   * @memberof Git
   * @param  {String}   dir - directory name
   * @param  {Function=} callback  - callback to be called when finished
   */
  mkdir(dir: string, callback: any) {
    // TODO: remove sync operations
    const parts = this.dirMap(dir).split(Path.sep)
    for (let i = 0; i <= parts.length; i++) {
      const directory = parts.slice(0, i).join(Path.sep)
      if (directory && !this.efs.existsSync(directory)) {
        this.efs.mkdirSync(directory)
      }
    }
    callback()
  }
  /**
   * Create a new bare repository `repoName` in the instance repository directory.
   * @method create
   * @memberof Git
   * @param  {String}   repo - the name of the repo
   * @param  {Function=} callback - Optionally get a callback `cb(err)` to be notified when the repository was created.
   */
  async create(repo: string, callback: any) {
    if (!/\.git$/.test(repo)) {
      repo += '.git'
    }

    this.exists(repo, function (ex) {
      if (!ex) {
        this.mkdir(repo, next)
      } else {
        next(null)
      }
    })

    async function next(err: string | boolean | null) {
      if (err) {
        throw (err)
      }

      const dir = this.dirMap(repo)
      try {
        await git.init({
          fs: this.fs,
          dir: dir,
          bare: !this.checkout
        })
        callback(null)
      } catch (err) {
        throw (err)
      }
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
  /**
   * Handle incoming HTTP requests with a connect-style middleware
   * @method handle
   * @memberof Git
   * @param  {Object} req - http request object
   * @param  {Object} res - http response object
   */
  handle(req: http.IncomingMessage, res: http.ServerResponse) {

    const handlers = [
      (req: http.IncomingMessage, res: http.ServerResponse) => {

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

        const repoName = Util.parseGitName(m[1])
        const next = (error) => {
          if (error) {
            res.setHeader("Content-Type", 'text/plain')
            res.setHeader("WWW-Authenticate", 'Basic realm="authorization needed"')
            res.writeHead(401)
            res.end(typeof error === 'string' ? error : error.toString())
            return
          } else {
            return Util.infoResponse(this, repo, service, req, res)
          }
        }

        // check if the repo is authenticated
        if (this.authenticate) {
          const type = this.getType(service)
          const headers = req.headers
          const user = Util.basicAuth.bind(null, req, res)
          const promise = this.authenticate({ type, repo: repoName, user, headers }, (error) => {
            return next(error)
          })

          if (promise instanceof Promise) {
            return promise
            .then(next)
            .catch(next)
          }
        } else {
          return next(null)
        }
      },
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        if (req.method !== 'GET') return false

        const u = url.parse(req.url!)
        const m = u.pathname!.match(/^\/(.+)\/HEAD$/)
        if (!m) return false
        if (/\.\./.test(m[1])) return false

        const repo = m[1]

        const next = () => {
          const file = this.dirMap(Path.join(m[1], 'HEAD'))
          this.exists(file, (ex) => {
            if (ex) {
              this.efs.createReadStream(file, {}).pipe(res)
            }
            else {
              res.statusCode = 404
              res.end('not found')
            }
          })
        }

        this.exists(repo, (ex) => {
          const anyListeners = this.listeners('head').length > 0
          const dup = new HttpDuplex(req, res)
          dup.exists = ex
          dup.repo = repo
          dup.cwd = this.dirMap(repo)

          dup.accept = dup.emit.bind(dup, 'accept')
          dup.reject = dup.emit.bind(dup, 'reject')

          dup.once('reject', (code) => {
            dup.statusCode = code || 500
            res.end()
          })

          if (!ex && this.autoCreate) {
            dup.once('accept', (dir) => {
              this.create(dir || repo, next)
            })
            this.emit('head', dup)
            if (!anyListeners) dup.accept()
          } else if (!ex) {
            res.statusCode = 404
            res.setHeader('content-type', 'text/plain')
            res.end('repository not found')
          } else {
            dup.once('accept', next)
            this.emit('head', dup)
            if (!anyListeners) dup.accept()
          }
        })
      },
      (req: http.IncomingMessage, res: http.ServerResponse) => {
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
        Util.noCache(res)

        const action = Util.createAction({
          repo: repo,
          service: service,
          cwd: this.dirMap(repo)
        }, req, res)

        action.on('header', () => {
          const evName = action.evName
          const anyListeners = this.listeners(evName).length > 0
          this.emit(evName, action)
          if (!anyListeners) action.accept()
        })
      },
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        console.log('res4');
        if (req.method !== 'GET' && req.method !== 'POST') {
          res.statusCode = 405
          res.end('method not supported')
        } else {
          return false
        }
      },
      (req: http.IncomingMessage, res: http.ServerResponse) => {
        console.log('res5');
        res.statusCode = 404
        res.end('not found')
      }
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
  listen(port: number, options: any, callback: any): Git {
    if (typeof options == 'function' || !options) {
      callback = options
      options = { type: 'http' }
    }

    if (options.type == 'http') {
      this.server = http.createServer((req, res) => {
        this.handle(req, res)
      })
    } else {
      this.server = https.createServer((req, res) => {
        this.handle(req, res)
      })
    }

    this.server.listen(port, callback)
    return this
  }
  /**
   * closes the server instance
   * @method close
   * @memberof Git
   * @param {Promise} - will resolve or reject when the server closes or fails to close.
   */
  close() {
    return new Promise((resolve, reject) => {
      this.server.close((err) => {
        err ? reject(err) : resolve()
      })
    })
  }
}

