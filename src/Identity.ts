// // @flow

// // this module should be used to represent an identity
// // which is a pub/priv keypair
// // since we are using kbpgp
// // then every identity has 1 kbpgp keymanager instance
// // that keymanger instance can have a pub key, a priv key or any number of other keys
// // we'll initiate with a root identity, which is the identity of the keynode

// type KeyPair = {
//     private: string,
//     public: string
// }

// class Primary {
//     key: { priv: string, pub: string }
//     lifespan: { generated: number, expire_in: number }
//     _pgp: {
//       key: KeyPair,
//       timestamp: number,
//       passphrase: string,
//       skm: string,
//       opts: Object[],
//       flags: number,
//       _is_duplicate_primary: boolean,
//       hasher: null,
//       _psc: any[]
//     }
//     flags: number
// }

// export default class Identity extends Object {
//     primary: Primary
//     subkeys: KeyPair[]
//     userids
//     KeyManager {
//         userids: [
//           UserID {
//             components: [Object],
//             userid: <Buffer 4a 6f 68 6e 20 53 6d 69 74 68 20 3c 6a 6f 68 6e 2e 73 6d 69 74 68 40 67 6d 61 69 6c 2e 63 6f 6d 3e>,
//             _psc: [Collection],
//             _time_primary_pair: null,
//             primary: false,
//             most_recent_sig: null
//           }
//         ],
//         armored_pgp_public: undefined,
//         armored_pgp_private: undefined,
//         user_attributes: undefined,
//         pgp: PgpEngine {
//           user_attributes: undefined,
//           primary: Primary {
//             key: [Pair],
//             lifespan: [Lifespan],
//             _pgp: [KeyMaterial],
//             _keybase: undefined,
//             flags: 47
//           },
//           subkeys: [],
//           userids: [ [UserID] ],
//           key_manager: [Circular],
//           packets: [],
//           messages: [],
//           _index: {
//             '\u0001\u0001" y�E,��|}F,�\u0000_�O��^|�\u001cv^�}��U(\n': [Primary]
//           }
//         },
//         engines: [
//           PgpEngine {
//             user_attributes: undefined,
//             primary: [Primary],
//             subkeys: [],
//             userids: [Array],
//             key_manager: [Circular],
//             packets: [],
//             messages: [],
//             _index: [Object]
//           }
//         ],
//         _signed: false,
//         p3skb: null
//       }
// }