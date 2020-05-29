import GitRefManager from './GitRefManager'
import { GitPktLine } from './GitPktLine'
import path from 'path'
import { EncryptedFS } from 'encryptedfs'

async function writeRefsAdResponse({ capabilities, refs, symrefs }) {
  const stream: Buffer[] = []
  // Compose capabilities string
  let syms = ''
  for (const [key, value] of Object.entries(symrefs)) {
    syms += `symref=${key}:${value} `
  }
  let caps = `\x00${[...capabilities].join(' ')} ${syms}agent=git/isomorphic-git@1.4.0`
  // stream.write(GitPktLine.encode(`# service=${service}\n`))
  // stream.write(GitPktLine.flush())
  // Note: In the edge case of a brand new repo, zero refs (and zero capabilities)
  // are returned.
  for (const [key, value] of Object.entries(refs)) {
    stream.push(GitPktLine.encode(`${value} ${key}${caps}\n`))
    caps = ''
  }
  stream.push(GitPktLine.flush())
  return stream
}

async function uploadPack(
  fileSystem: EncryptedFS,
  dir: string,
  gitdir: string = path.join(dir, '.git'),
  advertiseRefs: boolean = false,
) {
  try {
    if (advertiseRefs) {
      // Send a refs advertisement
      const capabilities = [
        // 'thin-pack',
        // 'side-band',
        'side-band-64k',
        // 'shallow',
        // 'deepen-since',
        // 'deepen-not',
        // 'allow-tip-sha1-in-want',
        // 'allow-reachable-sha1-in-want',
      ]
      let keys = await GitRefManager.listRefs(
        fileSystem,
        gitdir,
        'refs'
      )
      keys = keys.map(ref => `refs/${ref}`)
      const refs = {}
      keys.unshift('HEAD') // HEAD must be the first in the list
      for (const key of keys) {
        console.log('here at the end of the line');
        console.log(key);
        refs[key] = await GitRefManager.resolve(fileSystem, gitdir, key)
      }

      const symrefs = {}

      symrefs['HEAD'] = await GitRefManager.resolve(
        fileSystem,
        gitdir,
        'HEAD',
        2,
      )

      return writeRefsAdResponse({
        capabilities,
        refs,
        symrefs,
      })
    }
  } catch (err) {
    err.caller = 'git.uploadPack'
    throw err
  }
}

export default uploadPack
