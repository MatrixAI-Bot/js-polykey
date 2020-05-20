import Polykey from '../src/Polykey'
import fs from 'fs'
import {pipeWith} from 'pipe-ts'
import chalk from 'chalk'
import os from 'os'
import * as git from 'isomorphic-git'

const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')

const vfs = require('virtualfs')

import hkdf from 'futoin-hkdf'
import { EncryptedFS } from 'js-encryptedfs'
import Multiaddr from 'multiaddr'
import {TCP} from '../src/p2p/Transport/TCP'
import { MultiaddrConnection } from '../src/p2p/Transport/SocketToConnection'

const main = async function() {
  const tcp1 = new TCP()

  const listener = tcp1.createListener({}, (socket: MultiaddrConnection) => {
    console.log('new connection opened')
    pipe(
      ['hello'],
      socket
    )
  })

  const addr = new Multiaddr('/ip4/127.0.0.1/tcp/9090')
  await listener.listen(addr)
  console.log("listening");

  const socket = await tcp1.dial(addr, {})
  const values = await pipe(
    socket,
    collect
  )
  console.log(`Value: ${values.toString()}`)

  // Close connection after reading
  await listener.close()
  return
  // const vaultName = 'VaultYouPutInHere?'
  const km1 = new Polykey.KeyManager()
  // const key = await km.generateKeyPair('John Smith', 'john.smith@gmail.com', 'passphrase')
  // fs.mkdirSync('./playground/keys/', {recursive: true})
  // fs.writeFileSync('./playground/keys/private.key', key.private)
  // fs.writeFileSync('./playground/keys/public.key', key.public)

  const newAddr = new Multiaddr('/ip4/127.0.0.1/tcp/7005')
  console.log(newAddr.nodeAddress());

  // Peer 1
  console.log('Peer 1 start!')
  const polykey1 = new Polykey(Buffer.from('somestrongsecret239f8j298nf23092428iun'), km1)
  await polykey1.importKeyPair('./playground/keys/private.key', './playground/keys/public.key', 'passphrase')

  const vault1 = 'SomeVault1'
  console.log(`adding vault: ${vault1}`)
  if (!(await polykey1.vaultExists(vault1))) {
    polykey1.createVault(vault1)
  }


  const peerPath = polykey1.shareVault(vault1)
  console.log(`Peer 1 address: ${peerPath}`);


  // // Peer 2
  // console.log('Peer 2 start!')
  // const km2 = new Polykey.KeyManager()
  // const polykey2 = new Polykey(Buffer.from('somestrongsecret239f8j298nf23092428iun'), km2, undefined,'~/.polykey2')
  // await polykey2.importKeyPair('./playground/keys/private.key', './playground/keys/public.key', 'passphrase')

  // const vault2 = 'SomeVault2'
  // console.log(`adding vault: ${vault2}`)
  // if (!(await polykey1.vaultExists(vault2))) {
  //   polykey1.createVault(vault2)
  // }

  // console.log('Peer 2 connect to Peer 1!')
  // await polykey2.pullVault(peerPath, vault1)


  return



  // const signedPath = await polykey.signFile('./playground/file')
  // console.log(chalk.green(`file signed at: ${signedPath}`))

  // // Verify
  // const verifiedPath = './playground/file.verified'
  // await polykey.verifyFile(signedPath, verifiedPath)
  // console.log(chalk.green(`file verified at: ${verifiedPath}`))



  // await polykey1.startNode(4001)





  // await delay(1000)
  // const nodeAddr1 = (await polykey1.getNodeAddrs())[0]

  // console.log('polykey node listening on:')
  // console.log(nodeAddr1)

  // Add a directory
  // const dirPath = './someDirectory'
  // fs.mkdirSync(dirPath)


  // const polykey2 = new Polykey(Buffer.from('qwertyuiop'), undefined, undefined, `${os.homedir()}/polykey2`)
  // await polykey2.startNode(4005)

  // console.log('pk2 is connnecting to peer');

  // const remoteAddr = (await polykey2.connectToPeer(nodeAddr1)).remoteAddr.toString()
  // console.log('remoteAddr');
  // console.log(remoteAddr);

  // console.log('listedFiles');

  // await polykey1.listRemoteIPFSNode(cid)



  // const nodeAddr2 = (await polykey2.getNodeAddrs())[0]
  // console.log('polykey2 node listening on:')
  // console.log(nodeAddr2)


  // console.log('==================================');
  // console.log('==================================');
  // console.log('==================================');
  // const x = await polykey1._node.id()
  // console.log('id');
  // console.log(x);


  // let cid: any[] = []
  // for await (const file of polykey1._node.add(IPFS.globSource('./tests', { recursive: true }))) {
  //   console.log(file)
  //   console.log(`cid = ${file.cid}`);
  //   cid.push(file.cid)
  // }
  // console.log(cid);

  // console.log('cat files');
  // const chunks: any[] = []
  // for await (const chunk of polykey2._node.cat(cid[0])) {
  //   chunks.push(chunk)
  // }
  // console.log(Buffer.concat(chunks).toString())

  // console.log('==================================');
  // console.log('==================================');
  // console.log('==================================');

  // await polykey2.pingNode(nodeAddr1)
  // await polykey2.dialProtocol(nodeAddr1)

  // await polykey2.pullVault(nodeAddr1, 'Vault', 'sldkfmm')





  // // create vault
  // const vaultExists = await polykey.vaultExists(vaultName)
  //     .catch(err => console.error('Error checking vault existence', err.message))

  // if (!vaultExists) {
  //     await polykey.createVault(vaultName)
  //         .catch(e => console.error('Error while creating Vault', e.message))
  // }

  // // add secret
  // await polykey.addSecret(vaultName, 'ASecret', Buffer.from('super confidential information'))
  //     .catch(e => console.error('Error addding secret', e.message))

  // const secret = await polykey.getSecret(vaultName, 'ASecret')
  //     .catch(e => console.error('Error getting secret', e.message))

  // if (secret) {
  //     console.log(secret.toString())
  // }
}


main()
