#!/usr/bin/env node

// this will be a CLI entrypoint to this library
// we expect that this can be used as a CLI 
// application directly as js-polykey

import { program } from 'commander'
import PolyKey from '../src/Polykey'
import chalk from 'chalk'

let km = new PolyKey.KeyManager()
let pk = new PolyKey(km)
/*******************************************/
program
    .version(require('../package.json').version, '-v, --version', 'output the current version')


/*******************************************/
// secret
const secret = program.command('secret')
    .description('manipulate vaults')
    
/*******************************************/
// vault
const vault = program.command('vault')
.description('manipulate vaults')

/*******************************************/
// vault list
const list = vault.command('list')
    .description('list all available vaults')
    .alias('ls')
    .option('--v, --verbose', 'increase verbosity level by one')
    .action(async (options) => {
        try {
            if (options.verbose) {
                console.log(`vaults contained within polykey:`)
            }
            const vaultList = pk.listVaults()
            if (vaultList === undefined || vaultList.length == 0) {
                console.log('no vaults found')
            } else {
                vaultList.forEach((vaultName) => {
                    console.log(vaultName)
                })
            }
        } catch (err) {
            console.log(err.message)
        }
    })


/*******************************************/
// vault create
const create = vault.command('create')
create
    .description('create new vault(s)')
    .arguments('vault name(s)')
    .action(async (options) => {
        const vaultNames = options.args.values()
        for (const vaultName of vaultNames) {
            try {
                await pk.createVault(vaultName)
                console.log(`vault created at ${pk._polykeyPath}/${vaultName}`);
            } catch (err) {
                console.log(`Failed to creat vault ${vaultName}: ${err.message}`)
            }
        }
    })

/*******************************************/
// vault destroy
const destroy = vault.command('destroy')
destroy
    .description('destroy an existing vault')
    .option('-n, --vault-name <vaultName>', 'name of vault')
    .option('--all', 'remove all vaults')
    .action(async (options) => {
        try {
            if (options.all) {
                const vaultList = pk.listVaults()
                if (vaultList === undefined || vaultList.length == 0) {
                    console.log('no vaults found')
                } else {
                    for (const vaultName of vaultList) {
                        await pk.destroyVault(vaultName)
                        console.log(`destroyed ${vaultName}`)
                    }
                    console.log(chalk.green('all vaults destroyed successfully'))
                }
                return
            }
            const vaultName = options.vaultName
            if (!vaultName) {
                throw(Error(chalk.red('error: did not receive vault name')))
            }
            if (!(await pk.vaultExists(vaultName))) {
                console.log(`vault '${vaultName}' does not exist`)
                return
            }
            
            await pk.destroyVault(vaultName)
            console.log(`vault '${vaultName}' destroyed ${await pk.vaultExists(vaultName) ? 'un-' : ''}successfully`)
        } catch (err) {
            console.log(err.message)
        }
    })



// // Add subcommands
// program.addCommand()

// allow commander to parse `process.argv`
program.parse(process.argv);