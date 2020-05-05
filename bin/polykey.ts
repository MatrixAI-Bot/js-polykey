#!/usr/bin/env node

// this will be a CLI entrypoint to this library
// we expect that this can be used as a CLI 
// application directly as js-polykey

import { program } from 'commander'
import inquirer from 'inquirer'
import PolyKey from '../src/Polykey'
import chalk from 'chalk'
import os from 'os'

let pk: PolyKey
// Write a `file`
let tempDir: string
/*******************************************/
// initialization
function initPolyKey(
    password: string | null,
    polykeyPath: string | undefined = undefined,
    publicKeyPath: string | undefined = undefined,
    privateKeyPath: string | undefined = undefined,
    privatePassphrase: string | undefined = undefined,
    verbose: boolean | undefined = undefined
) {
    try {
        // Initialize polykey
        if (password !== null) {
            pk = new PolyKey(Buffer.from(password), undefined, undefined, polykeyPath)
        } else if (process.env.PK_KEY !== undefined) {
            pk = new PolyKey(Buffer.from(process.env.PK_KEY!), undefined, undefined, polykeyPath)
        } else {
            console.log(chalk.red('failed to initialize polykey: password was null'));
        }
        // import keys if provided
        if (publicKeyPath !== undefined) {
            pk._km.loadPublicKey(publicKeyPath)
            if (verbose) {
                console.log(chalk.green('public key successfully imported'))
            }
        }
        if (privateKeyPath !== undefined) {
            if (privatePassphrase !== undefined) {
                try {
                    pk._km.loadPrivateKey(privateKeyPath)
                    if (verbose) {
                        console.log(chalk.green('private key successfully imported'))
                    }
                } catch (err) {
                    console.log(chalk.red(`Failed to import private key: ${err.message}`))
                }
            } else {
                console.log(chalk.red('passphrase for private key not provided'))
            }
        }
        if (verbose) {
            console.log(chalk.green(`PolyKey was initialized successfully at '${pk.polykeyPath}'`));
        }
        // Initialization of temp directory (for testing)
        tempDir = pk._fs.mkdtempSync(`${os.tmpdir}/polykeytest`, undefined).toString()
        pk._fs.writeFileSync(`${tempDir}/file`, Buffer.from('I am to be signed'))
    } catch (err) {
        console.log(chalk.red(`Failed to initialize polykey: ${err.message}`))
    }
}
// Run initialization
/*******************************************/
const polykey = new program.Command()
polykey
    .version(require('../package.json').version, '--version', 'output the current version')

/*******************************************/
// init
const config = polykey.command('config')
    .description('configure polykey')
    .option('--password <password>', 'provide the password to polykey')
    .option('--public-key <publicKey>', 'provide the path to an existing public key')
    .option('--private-key <privateKey>', 'provide the path to an existing private key')
    .option('--private-passphrase <privatePassphrase>', 'provide the passphrase to the private key')
    .option('--polykey-path <polykeyPath>', 'provide the polykey path. defaults to ~/.polykey')
    .option('--verbose', 'increase verbosity by one level')
    .action(async (options) => {
        const password: string = options.password
        const polykeyPath: string | undefined = options.polykeyPath
        const publicKeyPath: string | undefined = options.publicKey
        const privateKeyPath: string | undefined = options.privateKey
        const privatePassphrase: string | undefined = options.privatePassphrase
        const verbose: boolean | undefined = options.verbose
        initPolyKey(
            password,
            polykeyPath,
            publicKeyPath,
            privateKeyPath,
            privatePassphrase,
            verbose
        )
    })



/*******************************************/
// keymanager create new keypair
const keymanager = polykey.command('keymanager')
    .description('manipulate the keymanager')

/*******************************************/
// node
const node = polykey.command('node')
node.description('network operations on the current polykey node')

/*******************************************/
// node start
const nodeStart = node.command('start')
    .description('start listening')
    .action(async (options) => {
        console.log('something something something');
        
    })

/*******************************************/
// secrets
const secrets = polykey.command('secrets')
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
            console.log(`Failed to list secrets for vault '${vaultName}': ${err.message}`)
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
const vault = polykey.command('vault')
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
                console.log(`vault created at ${pk.polykeyPath}/${vaultName}`);
            } catch (err) {
                console.log(`Failed to create vault ${vaultName}: ${err.message}`)
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
    .option('--verbose', 'increase verbosity by one level')
    .action(async (options) => {
        const verbose: boolean = options.verbose ?? false
        const deleteAll: boolean = options.all ?? false
        try {
            if (deleteAll) {
                const vaultList = pk.listVaults()
                if (vaultList === undefined || vaultList.length == 0) {
                    console.log('no vaults found')
                } else {
                    for (const vaultName of vaultList) {
                        await pk.destroyVault(vaultName)
                        if (verbose) {
                            console.log(chalk.green(`destroyed ${vaultName}`))
                        }
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
    .option('-k, --signing-key <signingKey>', 'path to key that will be used to sign files')
    .option('-p, --key-passphrase <keyPassphrase>', 'passphrase to unlock the provided signing key')
    .arguments('file(s) to be signed')
    .action(async (options) => {
        const signingKeyPath = options.signingKey
        const keyPassphrase = options.keyPassphrase
        const filePathList = options.args.values()
        for (const filePath of filePathList) {
            try {
                const signedPath = await pk.signFile(filePath, signingKeyPath, keyPassphrase)
                console.log(chalk.green(`file '${filePath}' successfully signed at '${signedPath}'`));
            } catch (err) {
                console.log(chalk.red(`failed to sign '${filePath}': ${err}`));
            }
        }
    })
/*******************************************/
// verify
const verify = polykey.command('verify')
verify
    .description('verification operations')
    .option('-k, --verifying-key <verifyingKey>', 'path to key that will be used to verify files')
    .arguments('file(s) to be verified')
    .action(async (options) => {
        const signingKeyPath = options.signingKey
        const filePathList = options.args.values()
        for (const filePath of filePathList) {
        try {
                let verifiedPath = filePath
                // Remove .sig suffix if it exists
                if (verifiedPath.split('.').pop() === 'sig') {
                    const temp = verifiedPath.split('.')
                    temp.pop()
                    verifiedPath = temp.join('.')
                }
                // Add .verified suffix
                verifiedPath = `${verifiedPath}.verified`
                await pk.verifyFile(filePath, verifiedPath, signingKeyPath)
                console.log(chalk.green(`file '${filePath}' successfully verified at '${verifiedPath}'`));
        } catch (err) {
                console.log(chalk.red(`failed to sign '${filePath}': ${err}`));
            }
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
