import { EncryptedFS } from "encryptedfs";
import nodeFs from 'fs'

export type KeyPair = {
    private: string,
    public: string,
    passphrase: string
}

export type GitFS = {
  readFile(path, options, callback)
  writeFile(file, data, options, callback)
  unlink(path, callback)
  readdir(path, options, callback)
  mkdir(path, mode, callback)
  rmdir(path, callback)
  stat(path, options, callback)
  lstat(path, options, callback)
  readlink(path, options, callback)
  symlink(target, path, type, callback)
  chmod(path, mode, callback)
  // For git server
  exists(path, callback)
  existsSync(path)
  mkdirSync(path, options?)
  createReadStream(path, options)
}

export function efsCallbackWrapper(efs: EncryptedFS): GitFS {
  const fs: GitFS = {
    readFile(path, options, callback) {
      efs.readFile(path, options).then((buffer) => {
        callback(null, buffer)
      }).catch((err) => {
        callback(err, null)
      })
    },
    writeFile(file, data, options, callback) {
      efs.writeFile(file, data, options).then(() => {
        callback(null)
      }).catch((err) => {
        callback(err)
      })
    },
    unlink(path, callback) {
      efs.unlink(path).then(() => {
        callback(null)
      }).catch((err) => {
        callback(err)
      })
    },
    readdir(path, options, callback) {
      efs.readdir(path, options).then((contents) => {
        callback(null, contents)
      }).catch((err) => {
        callback(err, null)
      })
    },
    mkdir(path, callback) {
      efs.mkdir(path).then((contents) => {
        callback(null, contents)
      }).catch((err) => {
        callback(err, null)
      })
    },
    rmdir(path, callback) {
      efs.rmdir(path).then(() => {
        callback(null)
      }).catch((err) => {
        callback(err)
      })
    },
    stat(path, callback) {
      efs.stat(path).then((stats) => {
        callback(null, stats)
      }).catch((err) => {
        callback(err, null)
      })
    },
    lstat(path, callback) {
      nodeFs.lstat(path, (err, stats) => {
        callback(err, stats)
      })
    },
    readlink(path, options, callback) {
      efs.readlink(path, options).then((data) => {
        callback(null, data)
      }).catch((err) => {
        callback(err, null)
      })
    },
    symlink(target, path, options, callback) {
      efs.symlink(target, path, options).then(() => {
        callback(null)
      }).catch((err) => {
        callback(err)
      })
    },
    chmod(path, mode, callback) {
      efs.chmod(path, mode).then(() => {
        callback(null)
      }).catch((err) => {
        callback(err)
      })
    },
    exists(path, callback) {
      efs.exists(path).then((exists) => {
        callback(exists)
      }).catch((err) => {
        callback(false)
      })
    },
    existsSync: efs.existsSync,
    mkdirSync: efs.mkdirSync,
    createReadStream: efs.createReadStream
  }
  return fs
}
