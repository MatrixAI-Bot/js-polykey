"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const command_1 = require("@oclif/command");
class PolyKey extends command_1.Command {
    async run() {
        const { args, flags } = this.parse(PolyKey);
        const name = flags.name || 'world';
        this.log(`hello ${name} from /root/cli/tmp/examples/example-multi-ts/src/commands/goodbye.ts`);
        if (args.file && flags.force) {
            this.log(`you input --force and --file: ${args.file}`);
        }
    }
}
exports.default = PolyKey;
PolyKey.description = 'describe the command here';
PolyKey.flags = {
    help: command_1.flags.help({ char: 'h' }),
    // flag with a value (-n, --name=VALUE)
    name: command_1.flags.string({ char: 'n', description: 'name to print' }),
    // flag with no value (-f, --force)
    force: command_1.flags.boolean({ char: 'f' }),
};
PolyKey.args = [{ name: 'file' }];
//# sourceMappingURL=polykey.js.map