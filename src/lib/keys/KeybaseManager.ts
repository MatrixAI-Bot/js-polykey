import Bot from 'keybase-bot'

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
}

export default KeybaseManager

async function main() {
  const km = new KeybaseManager()
  await km.init()

  console.log(await km.bot.myInfo());
  console.log(km.bot.chat.homeDir);
  console.log(km.bot.team.initialized);
  console.log(km.bot.team.username);
  console.log((await km.bot.team.listTeamMemberships({ team: 'polykey' })).members.owners![0]);
}
main()


