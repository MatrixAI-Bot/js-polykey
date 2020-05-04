#!/usr/bin/env node

// this will be a CLI entrypoint to this library
// we expect that this can be used as a CLI 
// application directly as js-polykey

import { program } from 'commander'
import PolyKey from '../src/Polykey'
import chalk from 'chalk'

let km = new PolyKey.KeyManager()
// km.generateKeyPair('Robert Cronin', 'robert@robert.com', '99e8ervv23f2').then((key) => {
//     console.log(key);
// })
let pk = new PolyKey(km, Buffer.from('some password'))
/*******************************************/
program
    .version(require('../package.json').version, '--version', 'output the current version')

/*******************************************/
// secrets
const secrets = program.command('secrets')
    .description('manipulate vault secrets')
    
/*******************************************/
// secrets list
const secretsList = secrets.command('list')
    .description('list all available secrets for a given vault')
    .alias('ls')
    .requiredOption('-v, --vault-name <vaultName>', 'the vault name')
    .option('--verbose', 'increase verbosity level by one')
    .action(async (options) => {
        const isVerbose: boolean = options.verbose ?? false
        const vaultName: string = options.vaultName
        try {
            // Check if vault exists
            if (!(await pk.vaultExists(vaultName))) {
                console.log(chalk.red(`vault '${vaultName}' does not exist!`))
                return
            }
            // Get list of secrets from pk
            const secretsList = await pk.listSecrets(vaultName)
            // List secrets
            if (isVerbose) {
                console.log(`secrets contained within the ${vaultName} vault:`)
            }
            if (secretsList === undefined || secretsList.length == 0) {
                console.log(`no secrets found for vault '${vaultName}'`)
            } else {
                secretsList.forEach((secretName) => {
                    console.log(chalk.blueBright(secretName))
                })
            }
        } catch (err) {
            console.log(err.message)
        }
    })

/*******************************************/
// secrets add
const secretAdd = secrets.command('add')
    .description('list all available secrets for a given vault')
    .requiredOption('-v, --vault-name <vaultName>', 'the vault name')
    .requiredOption('-s, --secret-name <secretName>', 'the new secret name')
    .option('--verbose', 'increase verbosity level by one')
    .action(async (options) => {
        const isVerbose: boolean = options.verbose ?? false
        const vaultName: string = options.vaultName
        const secretName: string = options.secretName
        try {
            // Check if vault exists
            if (!(await pk.vaultExists(vaultName))) {
                console.log(chalk.red(`vault '${vaultName}' does not exist!`))
                return
            }
            // Check if secret exists
            if (await pk.secretExists(vaultName, secretName)) {
                console.log(chalk.red(`secret '${secretName}' already exists in vault ${vaultName}!`))
                return
            }
            await pk.addSecret(vaultName, secretName, Buffer.from('some secret'))
            if (await pk.secretExists(vaultName, secretName)) {
                console.log(chalk.green(`secret '${secretName}' was sucessfully added to vault '${vaultName}'`))
            } else {
                console.log(chalk.green(`something went wrong, secret '${secretName}' was not added to vault '${vaultName}'`))
            }
        } catch (err) {
            console.log(err.message)
        }
    })
/*******************************************/
// vault
const vault = program.command('vault')
.description('manipulate vaults')

/*******************************************/
// vault list
const vaultList = vault.command('list')
    .description('list all available vaults')
    .alias('ls')
    .option('--verbose', 'increase verbosity level by one')
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
const vaultCreate = vault.command('create')
vaultCreate
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
const vaultDestroy = vault.command('destroy')
vaultDestroy
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


/*******************************************/
// sign
const sign = polykey.command('sign')
sign
    .description('signing operations')
    .requiredOption('-i, --input-path <inputPath>', 'path to file to be signed')
    .requiredOption('-o, --output-path <outputPath>', 'path to the signed file')
    .action(async (options) => {
        const inputPath = options.inputPath
        const outputPath = options.outputPath
        console.log(inputPath)
        console.log(outputPath)
        console.log(process.cwd());
        
        
        try {
            await pk.signFile(inputPath, outputPath)
            console.log(`file created at '${outputPath}'`);
        } catch (err) {
            console.log(chalk.red(`Failed to sign ${inputPath}: ${err}`));
        }
    })

const key = process.env.PK_KEY

if (key) {
    initPolyKey(key)
    polykey.parse(process.argv)
} else {
    inquirer
        .prompt([
            {
                type: 'password',
                name: 'key',
                message: 'Please provide PolyKey password'
            }
        ])
        .then(answers => {
            const key = answers.key
            // set password
            process.env.PK_KEY = key
            // initialization
            initPolyKey(key)
            polykey.parse(process.argv)
        })
        .catch(error => {
            if (error.isTtyError) {

            } else {

            }
        })
}

// allow commander to parse `process.argv`
program.parse(process.argv);