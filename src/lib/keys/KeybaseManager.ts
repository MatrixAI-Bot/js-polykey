import fs from 'fs'
import path from 'path'
import https from 'https'
import Bot from 'keybase-bot'


import kbpgp from 'kbpgp'
import triplesec from 'triplesec'
import request from 'request'
import { make_esc } from 'iced-error'
import { Auth } from 'keybase-proofs'
import { login } from 'keybase-login'

class KeybaseManager {
  bot: Bot
  constructor() {
    this.bot = new Bot()
  }

  async init() {
    await this.bot.initFromRunningService(undefined, { verbose: true, botLite: true })
    // Create 'polykey' team
    const result = await this.bot.team.create({ "team": "polykey" })
    console.log(result);
  }

  async storeValue(key: string, value: string) {
    const result = await this.bot.kvstore.put('polykey', 'polykey', key, value)
    return result.revision
  }

  async getValue(key: string) {
    const result = await this.bot.kvstore.get('polykey', 'polykey', key)
    return result.entryValue
  }

  async doPost(endpoint: string, body: Object) {
    return await new Promise<any>((resolve, reject) => {
      const data = JSON.stringify(body)

      const options: https.RequestOptions = {
        hostname: 'keybase.io',
        port: '443',
        path: `/_/api/1.0/${endpoint}.json`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length
        }
      }
      const req = https.request(options, (res) => {
        res.setEncoding('utf8')
        res.on('data', (data) => {
          resolve(JSON.parse(data))
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(data)
      req.end()
    })
  }

  async getSalt(username: string) {
    const response = await this.doPost('getsalt', {
      email_or_username: username,
      pdpka_login: true
    })

    return {
      salt: Buffer.from(response.salt, 'hex'),
      session: response.login_session
    }
  }

  async strechPassphrase(salt: Buffer, passphrase: string) {

    const key = new triplesec.Buffer(passphrase)
    const encryptor = new triplesec.Encryptor({ key })

    const extra = await new Promise<Buffer>((resolve, reject) => {
      encryptor.resalt({ data: salt, extra_keymaterial: 64 }, (err, res) => {
        if (err) {
          reject(err)
        } else {
          resolve(res.extra)
        }
      })
    })

    return { key4: extra.slice(0, 32), key5: extra.slice(32, 64) }
  }

  async makeSig(key, email, username, session) {
    const nonce = await new Promise<Buffer>((resolve, reject) => {
      kbpgp.rand.SRF().random_bytes(16, (nonce) => {
        resolve(nonce)
      })
    })

    const signer = await new Promise<any>((resolve, reject) => {
      kbpgp.kb.KeyManager.generate({ seed: key }, (err, signer) => {
        if (err) {
          reject(err)
        } else {
          resolve(signer)
        }
      })
    })

    const auth = new Auth({
      sig_eng: signer.make_sig_eng(),
      host: "keybase.io",
      user: {
        local: {
          email: email,
          username: username,
        }
      },
      session: session,
      nonce: nonce
    })

    const sig = await new Promise<any>((resolve, reject) => {
      auth.generate((err, sig) => {
        if (err) {
          reject(err)
        } else {
          resolve(sig)
        }
      })
    })

    return sig.armored
  }

  async postLogin(username, pdpka4, pdpka5) {
    const response = await this.doPost('login', {
      endpoint: "login",
      pdpka4: pdpka4,
      pdpka5: pdpka5,
      email_or_username: username
    })
    console.log(response);

    const res = {
      uid: response.uid,
      session: response.session,
      csrf_token: response.csrf_token,
      cookies: response.headers["set-cookie"],
      me: response.me
    }
    return res
  }
}

export default KeybaseManager

async function main() {
  const km = new KeybaseManager()
  // await km.init()


  const username = 'robertcronin'
  const email = 'robert.cronin@matrix.ai'
  const passphrase = ''
  login({username, passphrase}, (err, res) => {
    console.log(err);
    console.log(res);
  })
  // const { salt, session } = await km.getSalt(username)
  // const { key4, key5 } = await km.strechPassphrase(salt, passphrase)

  // const pdpka4 = await km.makeSig(key4, email, username, session)
  // const pdpka5 = await km.makeSig(key5, email, username, session)
  // console.log('pdpka4');
  // console.log(pdpka4);
  // console.log('pdpka5');
  // console.log(pdpka5);

  // const res = await km.postLogin(username, pdpka4, pdpka5)
  // console.log(res);

}
main()


