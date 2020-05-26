import Polykey from '../../src'
import PeerId from 'peer-id'
import Multiaddr from 'multiaddr'

const createNode = async (homeDir: string) => {
  const peerId = await PeerId.create()
  const pk = new Polykey(
    Buffer.from('ksjdnf'),
    undefined,
    undefined,
    homeDir,
    peerId
  )

  pk.addMultiaddr([new Multiaddr('/ip4/0.0.0.0/tcp/0')])

  const addr = await pk.start()
  console.log(addr);

  return pk
}

async function main() {
  const pk1 = await createNode('tmp/Polykey1')
  // const pk2 = await createNode('~/.polykey2')

  const pk1Vault = await pk1.createVault('Pk1Vault')
  // pk1.shareVault(pk1Vault.name)
}

main()
