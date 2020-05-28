import KeyManager from '../src/KeyManager';
import crypto from 'crypto';
import fs from 'fs-extra';
import Path from 'path';


const dt = new Date();
const keySizeBytes = 256/8;
const dumpPath = `./test/km_run${dt.getHours()}${dt.getMinutes()}${dt.getSeconds()}`;
const metaPath = Path.join('~', '.efs');
const staticKey = crypto.randomBytes(keySizeBytes);

describe('KeyManager Class', () => {
  let km: KeyManager
  let key: Buffer
  let storePath: string
  beforeEach(() => {
    km = new KeyManager(),
    key = crypto.randomBytes(keySizeBytes)
    storePath = Path.join('~', '.efs')
  });

  test('generateKeySync', () => {
    km.generateKeySync('strong_password');
    expect(km._key).not.toBeUndefined()
    expect(km._key.byteLength).toEqual(keySizeBytes);
  });

  test('loadKeySync', () => {
    const keyPath = Path.join(dumpPath, 'loadKeySync_key');

    fs.outputFileSync(keyPath, key);
    km.loadKeySync(keyPath);
    expect(km._key).toEqual(key);
  });

  test('loadKey', async () => {
    const keyPath = Path.join(dumpPath, 'loadKey_key');

    fs.outputFileSync(keyPath, key);
    await km.loadKey(keyPath);
    expect(km._key).toEqual(key);
  });

  test('loadKeyBuffer', () => {
    const keyPath = Path.join(dumpPath, 'loadKey_key');

    km.loadKeyBuffer(key);
    expect(km._key).toEqual(key);
  });

  test('storeKey', async () => {
    const keyPath = Path.join(dumpPath, 'storeKey_key');

    km.loadKeyBuffer(key);
    await km.storeKey(keyPath);
    const actual = await fs.readFile(keyPath);
    expect(key).toEqual(actual);
  });

  test('storeKeySync', () => {
    const keyPath = Path.join(dumpPath, 'storeKey_key');

    km.loadKeyBuffer(key);
    km.storeKeySync(keyPath);
    const actual = fs.readFileSync(keyPath);
    expect(key).toEqual(actual);
  });

  test('storeProfile - Key', async () => {
    const profileName = 'Assange';

    await km.loadKeyBuffer(staticKey);

    await km.storeProfile(profileName, true);

    const keyPath = Path.join(metaPath, profileName, 'key');
    const actual = await fs.readFile(keyPath)

    expect(actual).toEqual(staticKey);
  });

  test('loadProfile - Key', async () => {
    console.log('Just killing some time');
    await km.loadProfile('Assange');

    expect(staticKey).toEqual(km._key);
  });

  test('storeProfile - using passphrase', async () => {
    const profileName = 'Assange';

    km.generateKeySync('Julian');

    await km.storeProfile(profileName);

    const saltPath = Path.join(metaPath, profileName, 'salt');
    const actual = await fs.readFile(saltPath);

    expect(actual).toEqual(km._salt);
    // persist the key to test again loadProfile();
    await fs.outputFile(Path.join(dumpPath, 'storeProfile_saltyKey'), km._key);
  });

  test('loadProfile - using passphrase ', async () => {
    const profileName = 'Assange';
    const saltPath = Path.join(metaPath, profileName, 'salt');
    const salt = await fs.readFile(saltPath);
    const expected = await fs.readFile(Path.join(dumpPath, 'storeProfile_saltyKey'));

    // TODO: use async version
    km.generateKeySync('Julian', salt);
    expect(km._key).toEqual(expected);
  });

  test('getKey', () => {
    km.loadKeyBuffer(key);
    expect(km._key).toEqual(key);
  });

  test('isLoaded', () => {
    expect(km.isLoaded()).toEqual(false)
    km.loadKeyBuffer(key);
    expect(km.isLoaded()).toEqual(true)
  });

  afterAll(() => {
    fs.removeSync(dumpPath);
    fs.removeSync('~/.efs');
  });

})
