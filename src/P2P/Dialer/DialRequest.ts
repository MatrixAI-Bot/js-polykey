// import Multiaddr = require("multiaddr")
// import { TCP } from "../Transport/TCP"
// import Dialer from "./Dialer"
// import net from 'net'

// class DialRequest {
//   /**
//    * Manages running the `dialAction` on multiple provided `addrs` in parallel
//    * up to a maximum determined by the number of tokens returned
//    * from `dialer.getTokens`. Once a DialRequest is created, it can be
//    * started using `DialRequest.run(options)`. Once a single dial has succeeded,
//    * all other dials in the request will be cancelled.
//    * @param {object} options
//    * @param {Multiaddr[]} options.addrs
//    * @param {function(Multiaddr):Promise<Connection>} options.dialAction
//    * @param {Dialer} options.dialer
//    */

//   addrs: Multiaddr[]
//   dialer: Dialer
//   dialAction: (addr: Multiaddr, options: any) => Promise<net.Socket>
//   constructor (
//     addrs: Multiaddr[],
//     dialer: Dialer,
//     dialAction: any
//   ) {
//     this.addrs = addrs
//     this.dialer = dialer
//     this.dialAction = dialAction
//   }

//   /**
//    * @async
//    * @param {object} options
//    * @returns {Connection}
//    */
//   async run(options: any): Promise<net.Socket> {
//     const tokens = this.dialer.getTokens(this.addrs.length)
//     // If no tokens are available, throw
//     if (tokens.length < 1) {
//       throw(new Error('No dial tokens available'))
//     }

//     const tokenHolder = new Array()
//     tokens.forEach(token => tokenHolder.push(token))
//     // const dialAbortControllers = this.addrs.map(() => new AbortController())
//     let completedDials = 0

//     try {
//       return await Promise.race(this.addrs.map(async (addr, i) => {
//         const token = await tokenHolder.shift() // get token
//         let conn: net.Socket
//         try {
//           conn = await this.dialAction(addr, options)
//           // // Remove the successful AbortController so it is not aborted
//           // dialAbortControllers.splice(i, 1)
//         } finally {
//           completedDials++
//           // If we have more or equal dials remaining than tokens, recycle the token, otherwise release it
//           if (this.addrs.length - completedDials >= tokens.length) {
//             tokenHolder.push(token)
//           } else {
//             this.dialer.releaseToken(tokens.splice(tokens.indexOf(token), 1)[0])
//           }
//         }

//         return conn
//       }))
//     } finally {
//       // dialAbortControllers.map(c => c.abort()) // success/failure happened, abort everything else
//       tokens.forEach(token => this.dialer.releaseToken(token)) // release tokens back to the dialer
//     }
//   }
// }

// export default DialRequest
