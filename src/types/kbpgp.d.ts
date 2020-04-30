export class ASP {
    static make(asp: any): any;
    constructor(_arg: any);
    canceler(): any;
    delay(cb: any, ...args: any[]): void;
    progress(o: any, cb: any, ...args: any[]): any;
    progress_hook(): any;
    section(s: any): any;
}
export class Buffer {
    static BYTES_PER_ELEMENT: number;
    static alloc(size: any, fill: any, encoding: any): any;
    static allocUnsafe(size: any): any;
    static allocUnsafeSlow(size: any): any;
    static byteLength(string: any, encoding: any, ...args: any[]): any;
    static compare(a: any, b: any): any;
    static concat(list: any, length: any): any;
    static from(value: any, encodingOrOffset: any, length: any): any;
    static isBuffer(b: any): any;
    static isEncoding(encoding: any): any;
    static of(): any;
    static poolSize: number;
    constructor(arg: any, encodingOrOffset: any, length: any);
    asciiSlice(): any;
    asciiWrite(): any;
    base64Slice(): any;
    base64Write(): any;
    compare(target: any, start: any, end: any, thisStart: any, thisEnd: any, ...args: any[]): any;
    copy(target: any, targetStart: any, sourceStart: any, sourceEnd: any): any;
    copyWithin(p0: any, p1: any): any;
    entries(): any;
    equals(b: any): any;
    every(p0: any): any;
    fill(val: any, start: any, end: any, encoding: any): any;
    filter(p0: any): any;
    find(p0: any): any;
    findIndex(p0: any): any;
    forEach(p0: any): any;
    hexSlice(): any;
    hexWrite(): any;
    includes(val: any, byteOffset: any, encoding: any): any;
    indexOf(val: any, byteOffset: any, encoding: any): any;
    inspect(): any;
    join(p0: any): any;
    keys(): any;
    lastIndexOf(val: any, byteOffset: any, encoding: any): any;
    latin1Slice(): any;
    latin1Write(): any;
    map(p0: any): any;
    readDoubleBE(offset: any, noAssert: any): any;
    readDoubleLE(offset: any, noAssert: any): any;
    readFloatBE(offset: any, noAssert: any): any;
    readFloatLE(offset: any, noAssert: any): any;
    readInt16BE(offset: any, noAssert: any): any;
    readInt16LE(offset: any, noAssert: any): any;
    readInt32BE(offset: any, noAssert: any): any;
    readInt32LE(offset: any, noAssert: any): any;
    readInt8(offset: any, noAssert: any): any;
    readIntBE(offset: any, byteLength: any, noAssert: any): any;
    readIntLE(offset: any, byteLength: any, noAssert: any): any;
    readUInt16BE(offset: any, noAssert: any): any;
    readUInt16LE(offset: any, noAssert: any): any;
    readUInt32BE(offset: any, noAssert: any): any;
    readUInt32LE(offset: any, noAssert: any): any;
    readUInt8(offset: any, noAssert: any): any;
    readUIntBE(offset: any, byteLength: any, noAssert: any): any;
    readUIntLE(offset: any, byteLength: any, noAssert: any): any;
    reduce(p0: any): any;
    reduceRight(p0: any): any;
    reverse(): any;
    set(p0: any): any;
    slice(start: any, end: any): any;
    some(p0: any): any;
    sort(p0: any): any;
    subarray(p0: any, p1: any): any;
    swap16(): any;
    swap32(): any;
    swap64(): any;
    toJSON(): any;
    toLocaleString(encoding: any, start: any, end: any, ...args: any[]): any;
    toString(encoding: any, start: any, end: any, ...args: any[]): any;
    ucs2Slice(): any;
    ucs2Write(): any;
    utf8Slice(): any;
    utf8Write(): any;
    values(): any;
    write(string: any, offset: any, length: any, encoding: any): any;
    writeDoubleBE(val: any, offset: any, noAssert: any): any;
    writeDoubleLE(val: any, offset: any, noAssert: any): any;
    writeFloatBE(val: any, offset: any, noAssert: any): any;
    writeFloatLE(val: any, offset: any, noAssert: any): any;
    writeInt16BE(value: any, offset: any, noAssert: any): any;
    writeInt16LE(value: any, offset: any, noAssert: any): any;
    writeInt32BE(value: any, offset: any, noAssert: any): any;
    writeInt32LE(value: any, offset: any, noAssert: any): any;
    writeInt8(value: any, offset: any, noAssert: any): any;
    writeIntBE(value: any, offset: any, byteLength: any, noAssert: any): any;
    writeIntLE(value: any, offset: any, byteLength: any, noAssert: any): any;
    writeUInt16BE(value: any, offset: any, noAssert: any): any;
    writeUInt16LE(value: any, offset: any, noAssert: any): any;
    writeUInt32BE(value: any, offset: any, noAssert: any): any;
    writeUInt32LE(value: any, offset: any, noAssert: any): any;
    writeUInt8(value: any, offset: any, noAssert: any): any;
    writeUIntBE(value: any, offset: any, byteLength: any, noAssert: any): any;
    writeUIntLE(value: any, offset: any, byteLength: any, noAssert: any): any;
}
export class Burner {
    constructor(_arg: any);
    literals: any;
    opts: any;
    packets: any;
    signed_payload: any;
    burn(cb: any, ...args: any[]): void;
    collect_packets(): any;
    scrub(): void;
}
export class KeyFetcher {
    fetch(ids: any, ops: any, cb: any): any;
}
export class KeyManager {
    static generate(_arg: any, cb: any, ...args: any[]): void;
    static generate_ecc(_arg: any, cb: any): any;
    static generate_rsa(_arg: any, cb: any): any;
    static import_from_armored_pgp(_arg: any, cb: any, ...args: any[]): void;
    static import_from_p3skb(_arg: any, cb: any, ...args: any[]): void;
    static import_from_pgp_message(_arg: any, cb: any, ...args: any[]): void;
    constructor(_arg: any);
    primary: any;
    subkeys: any;
    userids: any;
    armored_pgp_public: any;
    armored_pgp_private: any;
    user_attributes: any;
    pgp: any;
    engines: any;
    p3skb: any;
    can_decrypt(): any;
    can_encrypt(): any;
    can_sign(): any;
    can_verify(): any;
    check_pgp_public_eq(km2: any): any;
    check_pgp_validity(cb: any): any;
    check_public_eq(km2: any): any;
    clear_pgp_internal_sigs(): any;
    export_pgp_keys_to_keyring(): any;
    export_pgp_private(...args: any[]): any;
    export_pgp_private_to_client(_arg: any, cb: any): any;
    export_pgp_public(_arg: any, cb: any): any;
    export_private(_arg: any, cb: any, ...args: any[]): void;
    export_private_to_server(_arg: any, cb: any, ...args: any[]): void;
    export_public(_arg: any, cb: any, ...args: any[]): void;
    fetch(key_ids: any, flags: any, cb: any): any;
    find_best_pgp_key(flags: any, need_priv: any): any;
    find_crypt_pgp_key(need_priv: any): any;
    find_pgp_key(key_id: any): any;
    find_pgp_key_material(key_id: any): any;
    find_signing_pgp_key(): any;
    find_verified_designated_revoke(fetcher: any, cb: any, ...args: any[]): any;
    find_verifying_pgp_key(): any;
    get_all_pgp_key_ids(): any;
    get_all_pgp_key_materials(): any;
    get_ekid(): any;
    get_ekid_b64_str(): any;
    get_fp2(): any;
    get_fp2_formatted(opts: any): any;
    get_pgp_designated_revocations(): any;
    get_pgp_fingerprint(): any;
    get_pgp_fingerprint_str(): any;
    get_pgp_key_id(): any;
    get_pgp_short_key_id(): any;
    get_primary_keypair(): any;
    get_type(): any;
    get_userids(): any;
    get_userids_mark_primary(): any;
    has_keybase_private(): any;
    has_p3skb_private(): any;
    has_pgp_private(): any;
    is_keybase_locked(): any;
    is_p3skb_locked(): any;
    is_pgp_locked(): any;
    is_pgp_revoked(): any;
    make_sig_eng(): any;
    merge_all_subkeys_omitting_revokes(km2: any): any;
    merge_everything(km2: any): any;
    merge_pgp_private(_arg: any, cb: any, ...args: any[]): void;
    merge_public_omitting_revokes(km2: any): any;
    merge_userids(km2: any): any;
    pgp_check_not_expired(_arg: any): any;
    pgp_full_hash(opts: any, cb: any, ...args: any[]): void;
    set_enc(e: any): any;
    sign(_arg: any, cb: any, ...args: any[]): void;
    sign_pgp(_arg: any, cb: any): any;
    simple_unlock(opts: any, cb: any, ...args: any[]): void;
    unlock_keybase(_arg: any, cb: any, ...args: any[]): void;
    unlock_p3skb(_arg: any, cb: any, ...args: any[]): void;
    unlock_pgp(_arg: any, cb: any, ...args: any[]): void;
}
export class KeyRing {
    add_key_manager(km: any): any;
    fetch(key_ids: any, ops: any, cb: any): any;
    find_best_key(_arg: any, cb: any): any;
    lookup(key_id: any): any;
}
export class PgpKeyRing {
    add_key_manager(km: any): any;
    fetch(key_ids: any, ops: any, cb: any): any;
    find_best_key(_arg: any, cb: any): any;
    lookup(key_id: any): any;
}
export class SignatureEngine {
    constructor(_arg: any);
    km: any;
    box(msg: any, cb: any, ...args: any[]): void;
    decode(armored: any, cb: any): any;
    get_body(args: any, cb: any): any;
    get_body_and_unverified_payload(_arg: any, cb: any, ...args: any[]): void;
    get_km(): any;
    get_unverified_payload_from_raw_sig_body(_arg: any, cb: any, ...args: any[]): void;
    unbox(msg: any, cb: any, opts: any, ...args: any[]): void;
}
export namespace armor {
    class Message {
        constructor(_arg: any);
        body: any;
        type: any;
        comment: any;
        version: any;
        pre: any;
        post: any;
        lines: any;
        fields: any;
        payload: any;
        finish_unframe(_arg: any): any;
        make_clearsign(): any;
        raw(): any;
        unsplit(lines: any): any;
    }
    function decode(data: any): any;
    function decode_strict(data: any): any;
    function encode(type: any, data: any): any;
    function mdecode(data: any): any;
}
export namespace asym {
    class DSA {
        static alloc(klass: any, _arg: any): any;
        static klass_name: string;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_sig(slice: any): any;
        static read_sig_from_buf(buf: any): any;
        static type: number;
        constructor(_arg: any);
        Priv(_arg: any): void;
        Pub(_arg: any): void;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_encrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        ekid(): any;
        eq(k2: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        nbits(): any;
        pad_and_sign(data: any, _arg: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        serialize(): any;
        validity_check(cb: any): any;
        verify_unpad_and_check_hash(_arg: any, cb: any): any;
    }
    namespace DSA {
        class Priv {
            static ORDER: any[];
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            x: any;
            pub: any;
            serialize(): any;
            sign(h: any, cb: any, ...args: any[]): void;
            validity_check(cb: any): any;
        }
        class Pub {
            static ORDER: any[];
            static alloc(raw: any): any;
            static type: number;
            constructor(_arg: any);
            p: any;
            q: any;
            g: any;
            y: any;
            nbits(): any;
            serialize(): any;
            trunc_hash(h: any): any;
            validity_check(cb: any): any;
            verify(_arg: any, h: any, cb: any): any;
        }
    }
    class ElGamal {
        static alloc(klass: any, _arg: any): any;
        static klass_name: string;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_output(buf: any): any;
        static type: number;
        constructor(_arg: any);
        Priv(_arg: any): void;
        Pub(_arg: any): void;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        decrypt_and_unpad(ciphertext: any, params: any, cb: any, ...args: any[]): void;
        ekid(): any;
        eq(k2: any): any;
        export_output(args: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        max_value(): any;
        nbits(): any;
        pad_and_encrypt(data: any, params: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        serialize(): any;
        validity_check(cb: any): any;
    }
    namespace ElGamal {
        class Priv {
            static ORDER: any[];
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            x: any;
            pub: any;
            decrypt(c: any, cb: any): any;
            serialize(): any;
            validity_check(cb: any): any;
        }
        class Pub {
            static ORDER: any[];
            static alloc(raw: any): any;
            static type: number;
            constructor(_arg: any);
            p: any;
            g: any;
            y: any;
            encrypt(m: any, cb: any, ...args: any[]): void;
            serialize(): any;
            validity_check(cb: any): any;
        }
    }
    class RSA {
        static alloc(_arg: any): any;
        static generate(_arg: any, cb: any, ...args: any[]): void;
        static klass_name: string;
        static make(_arg: any): any;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_output(buf: any): any;
        static parse_sig(slice: any): any;
        static subkey_algo(flags: any): any;
        static type: number;
        constructor(_arg: any);
        Priv(_arg: any): void;
        Pub(_arg: any): void;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        decrypt(c: any, cb: any): any;
        decrypt_and_unpad(ciphertext: any, params: any, cb: any, ...args: any[]): void;
        ekid(): any;
        encrypt(p: any, cb: any): any;
        eq(k2: any): any;
        export_output(args: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        max_value(): any;
        nbits(): any;
        pad_and_encrypt(data: any, params: any, cb: any, ...args: any[]): void;
        pad_and_sign(data: any, _arg: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        sanity_check(cb: any, ...args: any[]): void;
        serialize(): any;
        sign(m: any, cb: any): any;
        to_openpgp(): any;
        validity_check(cb: any, ...args: any[]): void;
        verify(s: any, cb: any): any;
        verify_unpad_and_check_hash(_arg: any, cb: any, ...args: any[]): void;
    }
    namespace RSA {
        class Priv {
            static ORDER: any[];
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            p: any;
            q: any;
            d: any;
            dmp1: any;
            dmq1: any;
            u: any;
            pub: any;
            decrypt(c: any, cb: any, ...args: any[]): void;
            lambda(): any;
            mod_pow_d_crt(x: any, cb: any, ...args: any[]): void;
            n(): any;
            phi(): any;
            serialize(): any;
            sign(m: any, cb: any): any;
            validity_check(cb: any): any;
        }
        class Pub {
            static ORDER: any[];
            static alloc(raw: any): any;
            static type: number;
            constructor(_arg: any);
            n: any;
            e: any;
            encrypt(p: any, cb: any): any;
            mod_pow(x: any, d: any, cb: any): any;
            nbits(): any;
            serialize(): any;
            validity_check(cb: any): any;
            verify(s: any, cb: any): any;
        }
    }
    function get_class(n: any): any;
}
export namespace base32 {
    const alphabet: string;
    const base: number;
    namespace basebn {
        const DB: number;
        const DM: number;
        const DV: number;
        const F1: number;
        const F2: number;
        const FV: number;
        function abs(): any;
        function add(a: any): any;
        function addTo(a: any, r: any): void;
        function am(i: any, x: any, w: any, j: any, c: any, n: any): any;
        function and(a: any): any;
        function andNot(a: any): any;
        function bitCount(): any;
        function bitLength(): any;
        function bitwiseTo(a: any, op: any, r: any): void;
        function byteLength(): any;
        function byteValue(): any;
        function changeBit(n: any, op: any): any;
        function chunkSize(r: any): any;
        function clamp(): void;
        function clearBit(n: any): any;
        function clone(): any;
        function compareTo(a: any): any;
        function copyTo(r: any): void;
        function dAddOffset(n: any, w: any): void;
        function dMultiply(n: any): void;
        function divRemTo(m: any, q: any, r: any): void;
        function divide(a: any): any;
        function divideAndRemainder(a: any): any;
        function dlShiftTo(n: any, r: any): void;
        function drShiftTo(n: any, r: any): void;
        function equals(a: any): any;
        function exp(e: any, z: any): any;
        function flipBit(n: any): any;
        function fromBuffer(buf: any): any;
        class fromInt {
            constructor(x: any);
            t: any;
            s: any;
        }
        function fromNumber(a: any, b: any, c: any): void;
        function fromRadix(s: any, b: any): void;
        class fromString {
            constructor(s: any, b: any, unsigned: any);
            t: any;
            s: any;
        }
        function gcd(a: any): any;
        function getLowestSetBit(): any;
        function inspect(): any;
        function intValue(): any;
        function invDigit(): any;
        function isEven(): any;
        function isProbablePrime(t: any): any;
        function lShiftTo(n: any, r: any): void;
        function max(a: any): any;
        function millerRabin(t: any): any;
        function min(a: any): any;
        function mod(a: any): any;
        function modInt(n: any): any;
        function modInverse(m: any): any;
        function modPow(e: any, m: any): any;
        function modPowInt(e: any, m: any): any;
        function mpi_byte_length(): any;
        function multiply(a: any): any;
        function multiplyLowerTo(a: any, n: any, r: any): void;
        function multiplyTo(a: any, r: any): void;
        function multiplyUpperTo(a: any, n: any, r: any): void;
        function negate(): any;
        function not(): any;
        function or(a: any): any;
        function pow(e: any): any;
        function rShiftTo(n: any, r: any): void;
        function remainder(a: any): any;
        const s: number;
        function setBit(n: any): any;
        function shiftLeft(n: any): any;
        function shiftRight(n: any): any;
        function shortValue(): any;
        function signum(): any;
        function square(): any;
        function squareTo(r: any): void;
        function subTo(a: any, r: any): void;
        function subtract(a: any): any;
        const t: number;
        function testBit(n: any): any;
        function toBuffer(size: any): any;
        function toByteArray(encode_sign_bit: any): any;
        function toByteArrayUnsigned(): any;
        function toDERInteger(): any;
        function toHex(size: any): any;
        function toMPI(): any;
        function toRadix(b: any): any;
        function toString(b: any): any;
        function to_mpi_buffer(): any;
        function to_padded_octets(base: any): any;
        function xor(a: any): any;
    }
    function decode(str: any): any;
    function encode(buffer: any): any;
    const lookup: {
        2: number;
        3: number;
        4: number;
        5: number;
        6: number;
        7: number;
        8: number;
        9: number;
        a: number;
        b: number;
        c: number;
        d: number;
        e: number;
        f: number;
        g: number;
        h: number;
        i: number;
        j: number;
        k: number;
        m: number;
        n: number;
        p: number;
        q: number;
        r: number;
        s: number;
        t: number;
        u: number;
        v: number;
        w: number;
        x: number;
        y: number;
        z: number;
    };
}
export namespace base58 {
    const alphabet: string;
    const base: number;
    namespace basebn {
        const DB: number;
        const DM: number;
        const DV: number;
        const F1: number;
        const F2: number;
        const FV: number;
        function abs(): any;
        function add(a: any): any;
        function addTo(a: any, r: any): void;
        function am(i: any, x: any, w: any, j: any, c: any, n: any): any;
        function and(a: any): any;
        function andNot(a: any): any;
        function bitCount(): any;
        function bitLength(): any;
        function bitwiseTo(a: any, op: any, r: any): void;
        function byteLength(): any;
        function byteValue(): any;
        function changeBit(n: any, op: any): any;
        function chunkSize(r: any): any;
        function clamp(): void;
        function clearBit(n: any): any;
        function clone(): any;
        function compareTo(a: any): any;
        function copyTo(r: any): void;
        function dAddOffset(n: any, w: any): void;
        function dMultiply(n: any): void;
        function divRemTo(m: any, q: any, r: any): void;
        function divide(a: any): any;
        function divideAndRemainder(a: any): any;
        function dlShiftTo(n: any, r: any): void;
        function drShiftTo(n: any, r: any): void;
        function equals(a: any): any;
        function exp(e: any, z: any): any;
        function flipBit(n: any): any;
        function fromBuffer(buf: any): any;
        class fromInt {
            constructor(x: any);
            t: any;
            s: any;
        }
        function fromNumber(a: any, b: any, c: any): void;
        function fromRadix(s: any, b: any): void;
        class fromString {
            constructor(s: any, b: any, unsigned: any);
            t: any;
            s: any;
        }
        function gcd(a: any): any;
        function getLowestSetBit(): any;
        function inspect(): any;
        function intValue(): any;
        function invDigit(): any;
        function isEven(): any;
        function isProbablePrime(t: any): any;
        function lShiftTo(n: any, r: any): void;
        function max(a: any): any;
        function millerRabin(t: any): any;
        function min(a: any): any;
        function mod(a: any): any;
        function modInt(n: any): any;
        function modInverse(m: any): any;
        function modPow(e: any, m: any): any;
        function modPowInt(e: any, m: any): any;
        function mpi_byte_length(): any;
        function multiply(a: any): any;
        function multiplyLowerTo(a: any, n: any, r: any): void;
        function multiplyTo(a: any, r: any): void;
        function multiplyUpperTo(a: any, n: any, r: any): void;
        function negate(): any;
        function not(): any;
        function or(a: any): any;
        function pow(e: any): any;
        function rShiftTo(n: any, r: any): void;
        function remainder(a: any): any;
        const s: number;
        function setBit(n: any): any;
        function shiftLeft(n: any): any;
        function shiftRight(n: any): any;
        function shortValue(): any;
        function signum(): any;
        function square(): any;
        function squareTo(r: any): void;
        function subTo(a: any, r: any): void;
        function subtract(a: any): any;
        const t: number;
        function testBit(n: any): any;
        function toBuffer(size: any): any;
        function toByteArray(encode_sign_bit: any): any;
        function toByteArrayUnsigned(): any;
        function toDERInteger(): any;
        function toHex(size: any): any;
        function toMPI(): any;
        function toRadix(b: any): any;
        function toString(b: any): any;
        function to_mpi_buffer(): any;
        function to_padded_octets(base: any): any;
        function xor(a: any): any;
    }
    function decode(str: any): any;
    function encode(buffer: any): any;
    const lookup: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
        6: number;
        7: number;
        8: number;
        9: number;
        A: number;
        B: number;
        C: number;
        D: number;
        E: number;
        F: number;
        G: number;
        H: number;
        J: number;
        K: number;
        L: number;
        M: number;
        N: number;
        P: number;
        Q: number;
        R: number;
        S: number;
        T: number;
        U: number;
        V: number;
        W: number;
        X: number;
        Y: number;
        Z: number;
        a: number;
        b: number;
        c: number;
        d: number;
        e: number;
        f: number;
        g: number;
        h: number;
        i: number;
        j: number;
        k: number;
        m: number;
        n: number;
        o: number;
        p: number;
        q: number;
        r: number;
        s: number;
        t: number;
        u: number;
        v: number;
        w: number;
        x: number;
        y: number;
        z: number;
    };
}
export namespace base91 {
    const alphabet: string;
    const base: number;
    namespace basebn {
        const DB: number;
        const DM: number;
        const DV: number;
        const F1: number;
        const F2: number;
        const FV: number;
        function abs(): any;
        function add(a: any): any;
        function addTo(a: any, r: any): void;
        function am(i: any, x: any, w: any, j: any, c: any, n: any): any;
        function and(a: any): any;
        function andNot(a: any): any;
        function bitCount(): any;
        function bitLength(): any;
        function bitwiseTo(a: any, op: any, r: any): void;
        function byteLength(): any;
        function byteValue(): any;
        function changeBit(n: any, op: any): any;
        function chunkSize(r: any): any;
        function clamp(): void;
        function clearBit(n: any): any;
        function clone(): any;
        function compareTo(a: any): any;
        function copyTo(r: any): void;
        function dAddOffset(n: any, w: any): void;
        function dMultiply(n: any): void;
        function divRemTo(m: any, q: any, r: any): void;
        function divide(a: any): any;
        function divideAndRemainder(a: any): any;
        function dlShiftTo(n: any, r: any): void;
        function drShiftTo(n: any, r: any): void;
        function equals(a: any): any;
        function exp(e: any, z: any): any;
        function flipBit(n: any): any;
        function fromBuffer(buf: any): any;
        class fromInt {
            constructor(x: any);
            t: any;
            s: any;
        }
        function fromNumber(a: any, b: any, c: any): void;
        function fromRadix(s: any, b: any): void;
        class fromString {
            constructor(s: any, b: any, unsigned: any);
            t: any;
            s: any;
        }
        function gcd(a: any): any;
        function getLowestSetBit(): any;
        function inspect(): any;
        function intValue(): any;
        function invDigit(): any;
        function isEven(): any;
        function isProbablePrime(t: any): any;
        function lShiftTo(n: any, r: any): void;
        function max(a: any): any;
        function millerRabin(t: any): any;
        function min(a: any): any;
        function mod(a: any): any;
        function modInt(n: any): any;
        function modInverse(m: any): any;
        function modPow(e: any, m: any): any;
        function modPowInt(e: any, m: any): any;
        function mpi_byte_length(): any;
        function multiply(a: any): any;
        function multiplyLowerTo(a: any, n: any, r: any): void;
        function multiplyTo(a: any, r: any): void;
        function multiplyUpperTo(a: any, n: any, r: any): void;
        function negate(): any;
        function not(): any;
        function or(a: any): any;
        function pow(e: any): any;
        function rShiftTo(n: any, r: any): void;
        function remainder(a: any): any;
        const s: number;
        function setBit(n: any): any;
        function shiftLeft(n: any): any;
        function shiftRight(n: any): any;
        function shortValue(): any;
        function signum(): any;
        function square(): any;
        function squareTo(r: any): void;
        function subTo(a: any, r: any): void;
        function subtract(a: any): any;
        const t: number;
        function testBit(n: any): any;
        function toBuffer(size: any): any;
        function toByteArray(encode_sign_bit: any): any;
        function toByteArrayUnsigned(): any;
        function toDERInteger(): any;
        function toHex(size: any): any;
        function toMPI(): any;
        function toRadix(b: any): any;
        function toString(b: any): any;
        function to_mpi_buffer(): any;
        function to_padded_octets(base: any): any;
        function xor(a: any): any;
    }
    function decode(str: any): any;
    function encode(buffer: any): any;
}
export namespace bn {
    class BigInteger {
        static fromBuffer(buf: any): any;
        static fromByteArrayUnsigned(b: any): any;
        static fromDERInteger(buf: any): any;
        static fromHex(s: any): any;
        static random_nbit(nbits: any, rf: any): any;
        static valueOf(x: any): any;
        constructor(a: any, b: any, c: any);
        abs(): any;
        add(a: any): any;
        addTo(a: any, r: any): void;
        am(i: any, x: any, w: any, j: any, c: any, n: any): any;
        and(a: any): any;
        andNot(a: any): any;
        bitCount(): any;
        bitLength(): any;
        bitwiseTo(a: any, op: any, r: any): void;
        byteLength(): any;
        byteValue(): any;
        changeBit(n: any, op: any): any;
        chunkSize(r: any): any;
        clamp(): void;
        clearBit(n: any): any;
        clone(): any;
        compareTo(a: any): any;
        copyTo(r: any): void;
        dAddOffset(n: any, w: any): void;
        dMultiply(n: any): void;
        divRemTo(m: any, q: any, r: any): void;
        divide(a: any): any;
        divideAndRemainder(a: any): any;
        dlShiftTo(n: any, r: any): void;
        drShiftTo(n: any, r: any): void;
        equals(a: any): any;
        exp(e: any, z: any): any;
        flipBit(n: any): any;
        fromBuffer(buf: any): any;
        fromInt(x: any): void;
        fromNumber(a: any, b: any, c: any): void;
        fromRadix(s: any, b: any): void;
        fromString(s: any, b: any, unsigned: any): any;
        gcd(a: any): any;
        getLowestSetBit(): any;
        inspect(): any;
        intValue(): any;
        invDigit(): any;
        isEven(): any;
        isProbablePrime(t: any): any;
        lShiftTo(n: any, r: any): void;
        max(a: any): any;
        millerRabin(t: any): any;
        min(a: any): any;
        mod(a: any): any;
        modInt(n: any): any;
        modInverse(m: any): any;
        modPow(e: any, m: any): any;
        modPowInt(e: any, m: any): any;
        mpi_byte_length(): any;
        multiply(a: any): any;
        multiplyLowerTo(a: any, n: any, r: any): void;
        multiplyTo(a: any, r: any): void;
        multiplyUpperTo(a: any, n: any, r: any): void;
        negate(): any;
        not(): any;
        or(a: any): any;
        pow(e: any): any;
        rShiftTo(n: any, r: any): void;
        remainder(a: any): any;
        setBit(n: any): any;
        shiftLeft(n: any): any;
        shiftRight(n: any): any;
        shortValue(): any;
        signum(): any;
        square(): any;
        squareTo(r: any): void;
        subTo(a: any, r: any): void;
        subtract(a: any): any;
        testBit(n: any): any;
        toBuffer(size: any): any;
        toByteArray(encode_sign_bit: any): any;
        toByteArrayUnsigned(): any;
        toDERInteger(): any;
        toHex(size: any): any;
        toMPI(): any;
        toRadix(b: any): any;
        toString(b: any): any;
        to_mpi_buffer(): any;
        to_padded_octets(base: any): any;
        xor(a: any): any;
    }
    namespace BigInteger {
        namespace ONE {
            const DB: number;
            const DM: number;
            const DV: number;
            const F1: number;
            const F2: number;
            const FV: number;
            function abs(): any;
            function add(a: any): any;
            function addTo(a: any, r: any): void;
            function am(i: any, x: any, w: any, j: any, c: any, n: any): any;
            function and(a: any): any;
            function andNot(a: any): any;
            function bitCount(): any;
            function bitLength(): any;
            function bitwiseTo(a: any, op: any, r: any): void;
            function byteLength(): any;
            function byteValue(): any;
            function changeBit(n: any, op: any): any;
            function chunkSize(r: any): any;
            function clamp(): void;
            function clearBit(n: any): any;
            function clone(): any;
            function compareTo(a: any): any;
            function copyTo(r: any): void;
            function dAddOffset(n: any, w: any): void;
            function dMultiply(n: any): void;
            function divRemTo(m: any, q: any, r: any): void;
            function divide(a: any): any;
            function divideAndRemainder(a: any): any;
            function dlShiftTo(n: any, r: any): void;
            function drShiftTo(n: any, r: any): void;
            function equals(a: any): any;
            function exp(e: any, z: any): any;
            function flipBit(n: any): any;
            function fromBuffer(buf: any): any;
            class fromInt {
                constructor(x: any);
                t: any;
                s: any;
            }
            function fromNumber(a: any, b: any, c: any): void;
            function fromRadix(s: any, b: any): void;
            class fromString {
                constructor(s: any, b: any, unsigned: any);
                t: any;
                s: any;
            }
            function gcd(a: any): any;
            function getLowestSetBit(): any;
            function inspect(): any;
            function intValue(): any;
            function invDigit(): any;
            function isEven(): any;
            function isProbablePrime(t: any): any;
            function lShiftTo(n: any, r: any): void;
            function max(a: any): any;
            function millerRabin(t: any): any;
            function min(a: any): any;
            function mod(a: any): any;
            function modInt(n: any): any;
            function modInverse(m: any): any;
            function modPow(e: any, m: any): any;
            function modPowInt(e: any, m: any): any;
            function mpi_byte_length(): any;
            function multiply(a: any): any;
            function multiplyLowerTo(a: any, n: any, r: any): void;
            function multiplyTo(a: any, r: any): void;
            function multiplyUpperTo(a: any, n: any, r: any): void;
            function negate(): any;
            function not(): any;
            function or(a: any): any;
            function pow(e: any): any;
            function rShiftTo(n: any, r: any): void;
            function remainder(a: any): any;
            const s: number;
            function setBit(n: any): any;
            function shiftLeft(n: any): any;
            function shiftRight(n: any): any;
            function shortValue(): any;
            function signum(): any;
            function square(): any;
            function squareTo(r: any): void;
            function subTo(a: any, r: any): void;
            function subtract(a: any): any;
            const t: number;
            function testBit(n: any): any;
            function toBuffer(size: any): any;
            function toByteArray(encode_sign_bit: any): any;
            function toByteArrayUnsigned(): any;
            function toDERInteger(): any;
            function toHex(size: any): any;
            function toMPI(): any;
            function toRadix(b: any): any;
            function toString(b: any): any;
            function to_mpi_buffer(): any;
            function to_padded_octets(base: any): any;
            function xor(a: any): any;
        }
        namespace ZERO {
            const DB: number;
            const DM: number;
            const DV: number;
            const F1: number;
            const F2: number;
            const FV: number;
            function abs(): any;
            function add(a: any): any;
            function addTo(a: any, r: any): void;
            function am(i: any, x: any, w: any, j: any, c: any, n: any): any;
            function and(a: any): any;
            function andNot(a: any): any;
            function bitCount(): any;
            function bitLength(): any;
            function bitwiseTo(a: any, op: any, r: any): void;
            function byteLength(): any;
            function byteValue(): any;
            function changeBit(n: any, op: any): any;
            function chunkSize(r: any): any;
            function clamp(): void;
            function clearBit(n: any): any;
            function clone(): any;
            function compareTo(a: any): any;
            function copyTo(r: any): void;
            function dAddOffset(n: any, w: any): void;
            function dMultiply(n: any): void;
            function divRemTo(m: any, q: any, r: any): void;
            function divide(a: any): any;
            function divideAndRemainder(a: any): any;
            function dlShiftTo(n: any, r: any): void;
            function drShiftTo(n: any, r: any): void;
            function equals(a: any): any;
            function exp(e: any, z: any): any;
            function flipBit(n: any): any;
            function fromBuffer(buf: any): any;
            class fromInt {
                constructor(x: any);
                t: any;
                s: any;
            }
            function fromNumber(a: any, b: any, c: any): void;
            function fromRadix(s: any, b: any): void;
            class fromString {
                constructor(s: any, b: any, unsigned: any);
                t: any;
                s: any;
            }
            function gcd(a: any): any;
            function getLowestSetBit(): any;
            function inspect(): any;
            function intValue(): any;
            function invDigit(): any;
            function isEven(): any;
            function isProbablePrime(t: any): any;
            function lShiftTo(n: any, r: any): void;
            function max(a: any): any;
            function millerRabin(t: any): any;
            function min(a: any): any;
            function mod(a: any): any;
            function modInt(n: any): any;
            function modInverse(m: any): any;
            function modPow(e: any, m: any): any;
            function modPowInt(e: any, m: any): any;
            function mpi_byte_length(): any;
            function multiply(a: any): any;
            function multiplyLowerTo(a: any, n: any, r: any): void;
            function multiplyTo(a: any, r: any): void;
            function multiplyUpperTo(a: any, n: any, r: any): void;
            function negate(): any;
            function not(): any;
            function or(a: any): any;
            function pow(e: any): any;
            function rShiftTo(n: any, r: any): void;
            function remainder(a: any): any;
            const s: number;
            function setBit(n: any): any;
            function shiftLeft(n: any): any;
            function shiftRight(n: any): any;
            function shortValue(): any;
            function signum(): any;
            function square(): any;
            function squareTo(r: any): void;
            function subTo(a: any, r: any): void;
            function subtract(a: any): any;
            const t: number;
            function testBit(n: any): any;
            function toBuffer(size: any): any;
            function toByteArray(encode_sign_bit: any): any;
            function toByteArrayUnsigned(): any;
            function toDERInteger(): any;
            function toHex(size: any): any;
            function toMPI(): any;
            function toRadix(b: any): any;
            function toString(b: any): any;
            function to_mpi_buffer(): any;
            function to_padded_octets(base: any): any;
            function xor(a: any): any;
        }
    }
    function bn_from_left_n_bits(raw: any, bits: any): any;
    function buffer_shift_right(buf: any, nbits: any): any;
    function mpi_from_buffer(raw: any): any;
    function mpi_to_padded_octets(bn: any, base: any): any;
    function nbi(): any;
    function nbits(x: any): any;
    function nbs(s: any, base: any): any;
    function nbv(i: any): any;
    function toMPI(bn: any): any;
}
export function box(_arg: any, cb: any, ...args: any[]): void;
export function burn(_arg: any, cb: any, ...args: any[]): void;
export function clearsign(_arg: any, cb: any, ...args: any[]): void;
export function detachsign(_arg: any, cb: any, ...args: any[]): void;
export namespace ecc {
    class ECDH {
        static alloc(klass: any, _arg: any): any;
        static generate(_arg: any, cb: any, ...args: any[]): void;
        static klass_name: string;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_output(buf: any): any;
        static type: number;
        constructor(...args: any[]);
        Priv(_arg: any): void;
        Pub(...args: any[]): any;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        decrypt_and_unpad(ciphertext: any, _arg: any, cb: any, ...args: any[]): void;
        ekid(): any;
        eq(k2: any): any;
        export_output(args: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        max_value(): any;
        nbits(): any;
        pad_and_encrypt(data: any, _arg: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        serialize(): any;
        validity_check(cb: any): any;
    }
    namespace ECDH {
        class Priv {
            static ORDER: any[];
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            x: any;
            pub: any;
            decrypt(c: any, _arg: any, cb: any, ...args: any[]): void;
            serialize(): any;
            validity_check(cb: any): any;
        }
        class Pub {
            static alloc(raw: any): any;
            static type: number;
            constructor(...args: any[]);
            apply_defaults(): any;
            encrypt(m: any, _arg: any, cb: any, ...args: any[]): void;
            format_params(_arg: any): any;
            kdf(_arg: any): any;
            read_params(sb: any): any;
            serialize(): any;
            serialize_params(): any;
            validity_check(cb: any): any;
        }
    }
    class ECDSA {
        static alloc(klass: any, _arg: any): any;
        static generate(_arg: any, cb: any): any;
        static klass_name: string;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_sig(slice: any): any;
        static read_sig_from_buf(buf: any): any;
        static subkey_algo(flags: any): any;
        static type: number;
        constructor(_arg: any);
        Priv(_arg: any): void;
        Pub(...args: any[]): any;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_encrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        ekid(): any;
        eq(k2: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        nbits(): any;
        pad_and_sign(data: any, _arg: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        serialize(): any;
        validity_check(cb: any): any;
        verify_unpad_and_check_hash(_arg: any, cb: any): any;
    }
    namespace ECDSA {
        class Priv {
            static ORDER: any[];
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            x: any;
            pub: any;
            serialize(): any;
            sign(h: any, cb: any, ...args: any[]): void;
            validity_check(cb: any): any;
        }
        class Pub {
            static alloc(raw: any): any;
            static type: number;
            constructor(...args: any[]);
            nbits(): any;
            read_params(sb: any): void;
            serialize(): any;
            trunc_hash(h: any): any;
            validity_check(cb: any): any;
            verify(_arg: any, h: any, cb: any): any;
        }
    }
    class EDDSA {
        static alloc(klass: any, raw: any): any;
        static eddsa_value_from_buffer(buf: any): any;
        static generate(_arg: any, cb: any, ...args: any[]): void;
        static klass_name: string;
        static parse(pub_raw: any): any;
        static parse_kb(klass: any, pub_raw: any): any;
        static parse_sig(slice: any): any;
        static read_sig_from_buf(buf: any): any;
        static subkey_algo(flags: any): any;
        static type: number;
        constructor(_arg: any);
        Priv(_arg: any): void;
        Pub(_arg: any): void;
        add_priv(priv_raw: any): any;
        can_decrypt(): any;
        can_encrypt(): any;
        can_perform(ops_mask: any): any;
        can_sign(): any;
        ekid(): any;
        eq(k2: any): any;
        find(i: any): any;
        fulfills_flags(flags: any): any;
        get_type(): any;
        good_for_flags(): any;
        has_private(): any;
        hash(): any;
        hide(_arg: any, cb: any, ...args: any[]): void;
        is_toxic(): any;
        nbits(): any;
        pad_and_sign(data: any, _arg: any, cb: any, ...args: any[]): void;
        read_priv(raw_priv: any): any;
        serialize(): any;
        validity_check(cb: any): any;
        verify_unpad_and_check_hash(_arg: any, cb: any): any;
    }
    namespace EDDSA {
        class Priv {
            static alloc(raw: any, pub: any): any;
            constructor(_arg: any);
            seed: any;
            key: any;
            pub: any;
            serialize(): any;
            sign(h: any, cb: any): any;
            validity_check(cb: any): any;
        }
        class Pub {
            static MPI_LENGTH_HEADERS: Buffer;
            static OID: Buffer;
            static alloc(raw: any): any;
            static type: number;
            constructor(_arg: any);
            key: any;
            nbits(): any;
            read_params(sb: any): void;
            serialize(): any;
            trunc_hash(h: any): any;
            validity_check(cb: any): any;
            verify(_arg: any, payload: any, cb: any): any;
        }
    }
    namespace curves {
        class Curve {
            constructor(_arg: any);
            oid: any;
            coord_to_mpi_buffer(p: any): any;
            decrypt(x: any, V: any): any;
            encrypt(R: any, cb: any, ...args: any[]): void;
            generate(cb: any, ...args: any[]): void;
            isInfinity(Q: any): any;
            isOnCurve(Q: any): any;
            mkpoint(_arg: any): any;
            mpi_bit_size(): any;
            mpi_byte_size(): any;
            mpi_coord_bit_size(): any;
            mpi_coord_byte_size(): any;
            mpi_from_buffer(raw: any): any;
            mpi_point_from_buffer(b: any): any;
            mpi_point_from_slicer_buffer(sb: any): any;
            nbits(): any;
            pointFromX(isOdd: any, x: any): any;
            point_to_mpi_buffer(p: any): any;
            point_to_mpi_buffer_compact(p: any): any;
            random_scalar(cb: any, ...args: any[]): void;
            validate(Q: any): any;
        }
        class Curve25519 {
            static reverse_buf(buf: any): any;
            constructor(_arg: any);
            oid: any;
            coord_to_mpi_buffer(p: any): any;
            decrypt(x: any, V: any): any;
            encrypt(R: any, cb: any, ...args: any[]): void;
            generate(cb: any, ...args: any[]): void;
            isInfinity(Q: any): any;
            isOnCurve(Q: any): any;
            mkpoint(_arg: any): any;
            mpi_bit_size(): any;
            mpi_byte_size(): any;
            mpi_coord_bit_size(): any;
            mpi_coord_byte_size(): any;
            mpi_from_buffer(raw: any): any;
            mpi_point_from_buffer(b: any): any;
            mpi_point_from_slicer_buffer(sb: any): any;
            nbits(): any;
            pointFromX(isOdd: any, x: any): any;
            point_to_mpi_buffer(p: any): any;
            point_to_mpi_buffer_compact(p: any): any;
            random_scalar(cb: any): any;
            validate(Q: any): any;
        }
        function H(x: any): any;
        function alloc_by_name(name: any): any;
        function alloc_by_nbits(nbits: any): any;
        function alloc_by_oid(oid: any): any;
        function brainpool_p256(): any;
        function brainpool_p384(): any;
        function brainpool_p512(): any;
        function cv25519(): any;
        function nist_p256(): any;
        function nist_p384(): any;
        function nist_p521(): any;
    }
}
export namespace errors {
    const OK: number;
    const REVOKED_KEY: number;
    class RevokedKeyError {
        constructor(msg: any);
        istack: any;
        code: any;
        inspect(): any;
    }
    const WRONG_SIGNING_KEY: number;
    class WrongSigningKeyError {
        constructor(msg: any);
        istack: any;
        code: any;
        inspect(): any;
    }
    const code: {
        OK: number;
        REVOKED_KEY: number;
        WRONG_SIGNING_KEY: number;
    };
    const msg: {
        0: string;
        100: string;
        101: string;
        OK: string;
        REVOKED_KEY: string;
        WRONG_SIGNING_KEY: string;
    };
    const name: {
        0: string;
        100: string;
        101: string;
        OK: string;
        REVOKED_KEY: string;
        WRONG_SIGNING_KEY: string;
    };
}
export namespace hash {
    function MD5(x: any): any;
    namespace MD5 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function RIPEMD160(x: any): any;
    namespace RIPEMD160 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function SHA1(x: any): any;
    namespace SHA1 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function SHA224(x: any): any;
    namespace SHA224 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function SHA256(x: any): any;
    namespace SHA256 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function SHA384(x: any): any;
    namespace SHA384 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function SHA512(x: any): any;
    namespace SHA512 {
        const algname: string;
        class klass {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        const output_length: number;
        const type: number;
    }
    function alloc(typ: any): any;
    function alloc_or_throw(typ: any): any;
    namespace streamers {
        function MD5(): any;
        function RIPEMD160(): any;
        function SHA1(): any;
        function SHA224(): any;
        function SHA256(): any;
        function SHA384(): any;
        function SHA512(): any;
    }
}
export namespace kb {
    class EncKeyManager {
        static generate(params: any, cb: any): any;
        static import_private(_arg: any, cb: any, ...args: any[]): any;
        static import_public(_arg: any, cb: any): any;
        constructor(...args: any[]);
        can_decrypt(): any;
        can_encrypt(): any;
        can_sign(): any;
        can_verify(): any;
        check_public_eq(km2: any): any;
        eq(km2: any): any;
        export_pgp_private(opts: any, cb: any): any;
        export_pgp_public(opts: any, cb: any): any;
        export_private(_arg: any, cb: any, ...args: any[]): void;
        export_public(_arg: any, cb: any): any;
        export_server_half(): any;
        fetch(key_ids: any, flags: any, cb: any): any;
        get_all_pgp_key_ids(): any;
        get_all_pgp_key_materials(): any;
        get_ekid(): any;
        get_fp2(): any;
        get_fp2_formatted(): any;
        get_keypair(): any;
        get_mask(): any;
        get_pgp_fingerprint(): any;
        get_primary_keypair(): any;
        get_type(): any;
        get_userids(): any;
        get_userids_mark_primary(): any;
        make_sig_eng(): any;
        pgp_full_hash(opts: any, cb: any): any;
    }
    class KeyManager {
        static generate(_arg: any, cb: any, ...args: any[]): void;
        static import_private(_arg: any, cb: any, ...args: any[]): any;
        static import_public(_arg: any, cb: any, ...args: any[]): any;
        constructor(_arg: any);
        key: any;
        server_half: any;
        can_decrypt(): any;
        can_encrypt(): any;
        can_sign(): any;
        can_verify(): any;
        check_public_eq(km2: any): any;
        eq(km2: any): any;
        export_pgp_private(opts: any, cb: any): any;
        export_pgp_public(opts: any, cb: any): any;
        export_private(_arg: any, cb: any, ...args: any[]): void;
        export_public(_arg: any, cb: any): any;
        export_server_half(): any;
        fetch(key_ids: any, flags: any, cb: any): any;
        get_all_pgp_key_ids(): any;
        get_all_pgp_key_materials(): any;
        get_ekid(): any;
        get_fp2(): any;
        get_fp2_formatted(): any;
        get_keypair(): any;
        get_mask(): any;
        get_pgp_fingerprint(): any;
        get_primary_keypair(): any;
        get_type(): any;
        get_userids(): any;
        get_userids_mark_primary(): any;
        make_sig_eng(): any;
        pgp_full_hash(opts: any, cb: any): any;
    }
    function box(_arg: any, cb: any, ...args: any[]): void;
    function decode_sig(_arg: any): any;
    function get_sig_body(_arg: any): any;
    function unbox(_arg: any, cb: any, ...args: any[]): void;
    function unbox_decode(_arg: any): any;
}
export namespace keyring {
    class KeyRing {
        add_key_manager(km: any): any;
        fetch(key_ids: any, ops: any, cb: any): any;
        find_best_key(_arg: any, cb: any): any;
        lookup(key_id: any): any;
    }
    class PgpKeyRing {
        add_key_manager(km: any): any;
        fetch(key_ids: any, ops: any, cb: any): any;
        find_best_key(_arg: any, cb: any): any;
        lookup(key_id: any): any;
    }
}
export function make_simple_literals(msg: any): any;
export const nacl: {
    dh: {
        DH: Function;
        Pair: Function;
    };
    eddsa: {
        EdDSA: Function;
        Pair: Function;
        b2u: Function;
        u2b: Function;
    };
};
export namespace opkts {
    class KeyMaterial {
        static parse_private_key(slice: any, opts: any): any;
        static parse_public_key(slice: any, opts: any): any;
        constructor(_arg: any);
        key: any;
        timestamp: any;
        passphrase: any;
        skm: any;
        opts: any;
        flags: any;
        add_designated_revocation(sig: any): any;
        add_designee(rev_key: any): any;
        add_flags(v: any): any;
        can_sign(): any;
        check_not_expired(_arg: any): any;
        clear_psc(): any;
        ekid(): any;
        equal(k2: any): any;
        export_framed(opts: any): any;
        frame_packet(tag: any, body: any): any;
        fulfills_flags(flags: any): any;
        get_all_key_flags(): any;
        get_data_signer(): any;
        get_data_signers(): any;
        get_designated_revocations(): any;
        get_expire_time(): any;
        get_fingerprint(): any;
        get_key_id(): any;
        get_klass(): any;
        get_psc(): any;
        get_short_key_id(): any;
        get_signed_user_attributes(): any;
        get_signed_userids(): any;
        get_subkey_binding(): any;
        get_subkey_binding_signature_output(): any;
        has_locked_private(): any;
        has_private(): any;
        has_secret_key_material(): any;
        has_unlocked_private(): any;
        inflate(cb: any): any;
        is_duplicate_primary(): any;
        is_key_material(): any;
        is_locked(): any;
        is_preferable_to(k2: any): any;
        is_primary(): any;
        is_revoked(): any;
        is_self_signed(): any;
        is_signature(): any;
        is_signed_subkey_of(primary: any, opts: any): any;
        mark_revoked(sig: any): any;
        merge_private(k2: any): any;
        private_body(opts: any): any;
        private_framed(opts: any): any;
        public_body(): any;
        public_framed(opts: any): any;
        push_sig(packetsig: any): any;
        replay(): any;
        self_sign_key(_arg: any, cb: any, ...args: any[]): void;
        set(d: any): any;
        set_duplicate_primary(): any;
        sign_subkey(_arg: any, cb: any, ...args: any[]): void;
        to_enc_data_packet(): any;
        to_esk_packet(): any;
        to_literal(): any;
        to_signature_payload(): any;
        to_user_attribute(): any;
        to_userid(): any;
        unlock(_arg: any, cb: any): any;
        validity_check(cb: any, ...args: any[]): void;
    }
    class Signature {
        static parse(slice: any): any;
        constructor(_arg: any);
        key: any;
        hasher: any;
        key_id: any;
        sig_data: any;
        public_key_class: any;
        signed_hash_value_hash: any;
        hashed_subpackets: any;
        time: any;
        sig: any;
        type: any;
        unhashed_subpackets: any;
        version: any;
        subpacket_index: any;
        clear_psc(): any;
        extract_key(data_packets: any): any;
        frame_packet(tag: any, body: any): any;
        get_data_signer(): any;
        get_data_signers(): any;
        get_framed_output(): any;
        get_issuer_fingerprint(): any;
        get_issuer_key_id(): any;
        get_key_expires(): any;
        get_key_flags(): any;
        get_key_id(): any;
        get_psc(): any;
        get_sig_expires(): any;
        get_signed_userids(): any;
        get_subkey_binding(): any;
        inflate(cb: any): any;
        is_duplicate_primary(): any;
        is_key_material(): any;
        is_self_signed(): any;
        is_signature(): any;
        issuer_matches_key(key: any): any;
        key_expiration_after_other(other: any): any;
        prepare_payload(data: any): any;
        push_sig(packetsig: any): any;
        replay(): any;
        set(d: any): any;
        time_primary_pair(): any;
        to_enc_data_packet(): any;
        to_esk_packet(): any;
        to_literal(): any;
        to_user_attribute(): any;
        to_userid(): any;
        verify(data_packets: any, cb: any, opts: any, ...args: any[]): void;
        when_generated(): any;
        write(data: any, cb: any, ...args: any[]): void;
        write_unframed(data: any, cb: any, ...args: any[]): void;
    }
    class UserID {
        static make(components: any): any;
        static parse(slice: any): any;
        constructor(userid: any, components: any);
        components: any;
        userid: any;
        primary: any;
        most_recent_sig: any;
        clear_psc(): any;
        cmp(b: any): any;
        frame_packet(tag: any, body: any): any;
        get_comment(): any;
        get_data_signer(): any;
        get_data_signers(): any;
        get_email(): any;
        get_framed_signature_output(): any;
        get_psc(): any;
        get_signed_userids(): any;
        get_subkey_binding(): any;
        get_username(): any;
        inflate(cb: any): any;
        is_duplicate_primary(): any;
        is_key_material(): any;
        is_revoked(): any;
        is_self_signed(): any;
        is_signature(): any;
        mark_revoked(sig: any): any;
        push_sig(packetsig: any): any;
        replay(): any;
        set(d: any): any;
        time_primary_pair(): any;
        to_enc_data_packet(): any;
        to_esk_packet(): any;
        to_literal(): any;
        to_signature_payload(): any;
        to_user_attribute(): any;
        to_userid(): any;
        utf8(): any;
        write(): any;
    }
}
export namespace parser {
    function parse(buf: any): any;
}
export namespace processor {
    class KeyBlock {
        constructor(packets: any, opts: any);
        packets: any;
        verified_signatures: any;
        subkeys: any;
        primary: any;
        userids: any;
        user_attributes: any;
        warnings: any;
        opts: any;
        process(cb: any, ...args: any[]): void;
        to_obj(): any;
    }
    class Message {
        constructor(_arg: any);
        keyfetch: any;
        data_fn: any;
        data: any;
        strict: any;
        now: any;
        literals: any;
        enc_data_packet: any;
        warnings: any;
        collect_literals(): any;
        parse_and_inflate(body: any, cb: any, ...args: any[]): void;
        parse_and_process(msg: any, cb: any, ...args: any[]): void;
    }
    function do_message(_arg: any, cb: any, ...args: any[]): void;
}
export namespace rand {
    function MRF(): any;
    function SRF(): any;
}
export namespace triplesec {
    class Base {
        constructor(_arg: any);
        version: any;
        derived_keys: any;
        clone_derived_keys(): any;
        kdf(_arg: any, cb: any, ...args: any[]): void;
        run_aes(_arg: any, cb: any, ...args: any[]): void;
        run_salsa20(_arg: any, cb: any, ...args: any[]): void;
        run_twofish(_arg: any, cb: any, ...args: any[]): void;
        scrub(): any;
        set_key(key: any): any;
        sign(_arg: any, cb: any, ...args: any[]): void;
    }
    class Buffer {
        static BYTES_PER_ELEMENT: number;
        static alloc(size: any, fill: any, encoding: any): any;
        static allocUnsafe(size: any): any;
        static allocUnsafeSlow(size: any): any;
        static byteLength(string: any, encoding: any, ...args: any[]): any;
        static compare(a: any, b: any): any;
        static concat(list: any, length: any): any;
        static from(value: any, encodingOrOffset: any, length: any): any;
        static isBuffer(b: any): any;
        static isEncoding(encoding: any): any;
        static of(): any;
        static poolSize: number;
        constructor(arg: any, encodingOrOffset: any, length: any);
        asciiSlice(): any;
        asciiWrite(): any;
        base64Slice(): any;
        base64Write(): any;
        compare(target: any, start: any, end: any, thisStart: any, thisEnd: any, ...args: any[]): any;
        copy(target: any, targetStart: any, sourceStart: any, sourceEnd: any): any;
        copyWithin(p0: any, p1: any): any;
        entries(): any;
        equals(b: any): any;
        every(p0: any): any;
        fill(val: any, start: any, end: any, encoding: any): any;
        filter(p0: any): any;
        find(p0: any): any;
        findIndex(p0: any): any;
        forEach(p0: any): any;
        hexSlice(): any;
        hexWrite(): any;
        includes(val: any, byteOffset: any, encoding: any): any;
        indexOf(val: any, byteOffset: any, encoding: any): any;
        inspect(): any;
        join(p0: any): any;
        keys(): any;
        lastIndexOf(val: any, byteOffset: any, encoding: any): any;
        latin1Slice(): any;
        latin1Write(): any;
        map(p0: any): any;
        readDoubleBE(offset: any, noAssert: any): any;
        readDoubleLE(offset: any, noAssert: any): any;
        readFloatBE(offset: any, noAssert: any): any;
        readFloatLE(offset: any, noAssert: any): any;
        readInt16BE(offset: any, noAssert: any): any;
        readInt16LE(offset: any, noAssert: any): any;
        readInt32BE(offset: any, noAssert: any): any;
        readInt32LE(offset: any, noAssert: any): any;
        readInt8(offset: any, noAssert: any): any;
        readIntBE(offset: any, byteLength: any, noAssert: any): any;
        readIntLE(offset: any, byteLength: any, noAssert: any): any;
        readUInt16BE(offset: any, noAssert: any): any;
        readUInt16LE(offset: any, noAssert: any): any;
        readUInt32BE(offset: any, noAssert: any): any;
        readUInt32LE(offset: any, noAssert: any): any;
        readUInt8(offset: any, noAssert: any): any;
        readUIntBE(offset: any, byteLength: any, noAssert: any): any;
        readUIntLE(offset: any, byteLength: any, noAssert: any): any;
        reduce(p0: any): any;
        reduceRight(p0: any): any;
        reverse(): any;
        set(p0: any): any;
        slice(start: any, end: any): any;
        some(p0: any): any;
        sort(p0: any): any;
        subarray(p0: any, p1: any): any;
        swap16(): any;
        swap32(): any;
        swap64(): any;
        toJSON(): any;
        toLocaleString(encoding: any, start: any, end: any, ...args: any[]): any;
        toString(encoding: any, start: any, end: any, ...args: any[]): any;
        ucs2Slice(): any;
        ucs2Write(): any;
        utf8Slice(): any;
        utf8Write(): any;
        values(): any;
        write(string: any, offset: any, length: any, encoding: any): any;
        writeDoubleBE(val: any, offset: any, noAssert: any): any;
        writeDoubleLE(val: any, offset: any, noAssert: any): any;
        writeFloatBE(val: any, offset: any, noAssert: any): any;
        writeFloatLE(val: any, offset: any, noAssert: any): any;
        writeInt16BE(value: any, offset: any, noAssert: any): any;
        writeInt16LE(value: any, offset: any, noAssert: any): any;
        writeInt32BE(value: any, offset: any, noAssert: any): any;
        writeInt32LE(value: any, offset: any, noAssert: any): any;
        writeInt8(value: any, offset: any, noAssert: any): any;
        writeIntBE(value: any, offset: any, byteLength: any, noAssert: any): any;
        writeIntLE(value: any, offset: any, byteLength: any, noAssert: any): any;
        writeUInt16BE(value: any, offset: any, noAssert: any): any;
        writeUInt16LE(value: any, offset: any, noAssert: any): any;
        writeUInt32BE(value: any, offset: any, noAssert: any): any;
        writeUInt32LE(value: any, offset: any, noAssert: any): any;
        writeUInt8(value: any, offset: any, noAssert: any): any;
        writeUIntBE(value: any, offset: any, byteLength: any, noAssert: any): any;
        writeUIntLE(value: any, offset: any, byteLength: any, noAssert: any): any;
    }
    const CURRENT_VERSION: number;
    class Decryptor {
        constructor(_arg: any);
        key: any;
        derived_keys: any;
        clone(): any;
        clone_derived_keys(): any;
        generate_keys(_arg: any, cb: any, ...args: any[]): void;
        kdf(_arg: any, cb: any, ...args: any[]): void;
        read_header(cb: any): any;
        read_salt(cb: any): any;
        run(_arg: any, cb: any, ...args: any[]): void;
        run_aes(_arg: any, cb: any, ...args: any[]): void;
        run_salsa20(_arg: any, cb: any, ...args: any[]): void;
        run_twofish(_arg: any, cb: any, ...args: any[]): void;
        scrub(): any;
        set_key(key: any): any;
        sign(_arg: any, cb: any, ...args: any[]): void;
        unshift_iv(n_bytes: any, which: any, cb: any): any;
        verify_sig(key: any, cb: any, ...args: any[]): void;
    }
    class Encryptor {
        constructor(_arg: any);
        rng: any;
        clone(): any;
        clone_derived_keys(): any;
        kdf(_arg: any, cb: any, ...args: any[]): void;
        pick_random_ivs(_arg: any, cb: any, ...args: any[]): void;
        resalt(_arg: any, cb: any, ...args: any[]): void;
        run(_arg: any, cb: any, ...args: any[]): void;
        run_aes(_arg: any, cb: any, ...args: any[]): void;
        run_salsa20(_arg: any, cb: any, ...args: any[]): void;
        run_twofish(_arg: any, cb: any, ...args: any[]): void;
        scrub(): any;
        set_key(key: any): any;
        sign(_arg: any, cb: any, ...args: any[]): void;
    }
    class HMAC {
        static outputSize: number;
        constructor(key: any, klass: any);
        key: any;
        hasher: any;
        hasherBlockSize: any;
        hasherBlockSizeBytes: any;
        finalize(wa: any): any;
        get_output_size(): any;
        reset(): any;
        scrub(): any;
        update(wa: any): any;
    }
    class HMAC_SHA256 {
        static outputSize: number;
        constructor(key: any);
        finalize(wa: any): any;
        get_output_size(): any;
        reset(): any;
        scrub(): any;
        update(wa: any): any;
    }
    const V: {
        1: {
            header: any[];
            hmac_hashes: any[];
            hmac_key_size: number;
            kdf: {
                klass: any;
                opts: any;
            };
            salt_size: number;
            use_twofish: boolean;
            version: number;
            xsalsa20_rev: boolean;
        };
        2: {
            header: any[];
            hmac_hashes: any[];
            hmac_key_size: number;
            kdf: {
                klass: any;
                opts: any;
            };
            salt_size: number;
            use_twofish: boolean;
            version: number;
            xsalsa20_rev: boolean;
        };
        3: {
            header: any[];
            hmac_hashes: any[];
            hmac_key_size: number;
            kdf: {
                klass: any;
                opts: any;
            };
            salt_size: number;
            use_twofish: boolean;
            version: number;
            xsalsa20_rev: boolean;
        };
        4: {
            header: any[];
            hmac_hashes: any[];
            hmac_key_size: number;
            kdf: {
                klass: any;
                opts: any;
            };
            salt_size: number;
            use_twofish: boolean;
            version: number;
            xsalsa20_rev: boolean;
        };
    };
    class WordArray {
        static alloc(b: any): any;
        static from_buffer(b: any): any;
        static from_buffer_le(b: any): any;
        static from_hex(s: any): any;
        static from_hex_le(s: any): any;
        static from_i32a(v: any): any;
        static from_ui8a(v: any): any;
        static from_utf8(s: any): any;
        static from_utf8_le(s: any): any;
        constructor(words: any, sigBytes: any);
        words: any;
        sigBytes: any;
        clamp(): any;
        clone(): any;
        cmp_ule(wa2: any): any;
        concat(wordArray: any): any;
        endian_reverse(): any;
        equal(wa: any): any;
        is_scrubbed(): any;
        scrub(): any;
        slice(low: any, hi: any): any;
        split(n: any): any;
        to_buffer(): any;
        to_hex(): any;
        to_ui8a(): any;
        to_utf8(): any;
        truncate(n_bytes: any): any;
        unshift(n_words: any): any;
        xor(wa2: any, _arg: any): any;
    }
    namespace ciphers {
        class AES {
            static blockSize: number;
            static ivSize: number;
            static keySize: number;
            constructor(key: any);
            decryptBlock(M: any, offset: any): any;
            encryptBlock(M: any, offset: any): any;
            scrub(): any;
        }
        class Salsa20 {
            static blockSize: number;
            static ivSize: number;
            static keySize: number;
            constructor(...args: any[]);
            counter_setup(): any;
            getBytes(needed: any): any;
            hsalsa20(nonce: any, key: any): any;
            key_iv_setup(nonce: any, key: any): any;
            scrub(): any;
            xsalsa_setup(): any;
        }
        class TwoFish {
            static blockSize: number;
            static ivSize: number;
            static keySize: number;
            constructor(key: any);
            gMDS0: any;
            gMDS1: any;
            gMDS2: any;
            gMDS3: any;
            gSubKeys: any;
            gSBox: any;
            k64Cnt: any;
            F32(x: any, k32: any): any;
            Fe32_0(x: any): any;
            Fe32_3(x: any): any;
            LFSR1(x: any): any;
            LFSR2(x: any): any;
            Mx_X(x: any): any;
            Mx_Y(x: any): any;
            RS_MDS_Encode(k0: any, k1: any): any;
            RS_rem(x: any): any;
            decryptBlock(M: any, offset: any): any;
            encryptBlock(M: any, offset: any): any;
            getByte(x: any, n: any): any;
            scrub(): any;
            switchEndianness(word: any): any;
        }
    }
    function decrypt(_arg: any, cb: any, ...args: any[]): void;
    function encrypt(_arg: any, cb: any, ...args: any[]): void;
    namespace hash {
        class KECCAK {
            static blockSize: number;
            static outputLength: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            scrub(): void;
            update(messageUpdate: any): any;
        }
        class MD5 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        class RIPEMD160 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        class SHA1 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        class SHA224 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        class SHA256 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(messageUpdate: any): any;
        }
        class SHA3 {
            static blockSize: number;
            static outputLength: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            scrub(): void;
            update(messageUpdate: any): any;
        }
        class SHA384 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
        class SHA3STD {
            static blockSize: number;
            static outputLength: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            scrub(): void;
            update(messageUpdate: any): any;
        }
        class SHA512 {
            static blockSize: number;
            static output_size: number;
            constructor(...args: any[]);
            bufhash(input: any): any;
            clone(): any;
            copy_to(obj: any): any;
            finalize(messageUpdate: any): any;
            reset(): any;
            update(messageUpdate: any): any;
        }
    }
    namespace hmac {
        class HMAC {
            static outputSize: number;
            constructor(key: any, klass: any);
            key: any;
            hasher: any;
            hasherBlockSize: any;
            hasherBlockSizeBytes: any;
            finalize(wa: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(wa: any): any;
        }
        class HMAC_SHA256 {
            static outputSize: number;
            constructor(key: any);
            finalize(wa: any): any;
            get_output_size(): any;
            reset(): any;
            scrub(): any;
            update(wa: any): any;
        }
        function bulk_sign(_arg: any, cb: any, ...args: any[]): void;
        function sign(_arg: any): any;
    }
    const modes: {
        CTR: {
            Cipher: Function;
            Counter: Function;
            bulk_encrypt: Function;
            encrypt: Function;
        };
    };
    function pbkdf2(_arg: any, cb: any, ...args: any[]): void;
    namespace prng {
        class PRNG {
            meg: any;
            adrbg: any;
            gen_seed(nbits: any, cb: any, ...args: any[]): void;
            generate(n: any, cb: any): any;
            now_to_buffer(): any;
        }
        function generate(n: any, cb: any): any;
        function native_rng(x: any): any;
    }
    function scrypt(_arg: any, cb: any, ...args: any[]): void;
    namespace util {
        function buffer_cmp_ule(b1: any, b2: any): any;
        function bulk(n_input_bytes: any, _arg: any, _arg1: any, ...args: any[]): void;
        function copy_buffer(b: any): any;
        function default_delay(i: any, n: any, cb: any, ...args: any[]): void;
        function fixup_uint32(x: any): any;
        function scrub_buffer(b: any): any;
        function scrub_vec(v: any): any;
    }
}
export namespace ukm {
    function decode_sig(_arg: any): any;
    function get_sig_body(_arg: any): any;
    function import_armored_public(_arg: any, cb: any, ...args: any[]): void;
}
export function unbox(_arg: any, cb: any, ...args: any[]): void;
export namespace util {
    class ASP {
        static make(asp: any): any;
        constructor(_arg: any);
        canceler(): any;
        delay(cb: any, ...args: any[]): void;
        progress(o: any, cb: any, ...args: any[]): any;
        progress_hook(): any;
        section(s: any): any;
    }
    class Warnings {
        push(...args: any[]): any;
        warnings(): any;
    }
    function akatch(fn: any, cb: any): any;
    function assert_no_nulls(v: any): any;
    function asyncify(args: any, cb: any): any;
    function athrow(err: any, cb: any): any;
    namespace base64u {
        function decode(b: any): any;
        function encode(b: any): any;
        function verify(b: any): any;
    }
    function bufeq_fast(x: any, y: any): any;
    function bufeq_secure(x: any, y: any): any;
    function buffer_to_ui8a(b: any): any;
    function bufferify(s: any): any;
    function bufxor(b1: any, b2: any): any;
    function calc_checksum(text: any): any;
    function encode_length(l: any, five_byte: any): any;
    function fingerprint_to_key_id_64(fp: any): any;
    function fit_to_size(size: any, buf: any): any;
    function format_fingerprint(raw: any): any;
    function format_pgp_fingerprint_2(buf: any, opts: any): any;
    function fpeq(fp1: any, fp2: any): any;
    function genseed(_arg: any, cb: any, ...args: any[]): void;
    function json_stringify_sorted(o: any, opts: any): any;
    function katch(fn: any): any;
    function make_time_packet(d: any): any;
    function obj_extract(o: any, keys: any): any;
    function ops_to_keyflags(ops: any): any;
    function streq_secure(x: any, y: any): any;
    function strip(x: any): any;
    function trim(x: any): any;
    function ui32a_to_ui8a(v: any, out: any): any;
    function ui8a_to_ui32a(v: any, out: any): any;
    function uint_to_buffer(nbits: any, i: any): any;
    function unix_time(): any;
    function xxd(buf: any, opts: any): any;
}