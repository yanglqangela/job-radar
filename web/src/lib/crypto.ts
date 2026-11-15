/**
 * 加密信封：PBKDF2-HMAC-SHA256(600k) -> AES-256-GCM
 *
 * 必须在 Python(cryptography) 与浏览器(Web Crypto) 之间逐字节兼容：
 * - 密钥：PBKDF2(password NFKC, salt, iterations) 32 字节
 * - 密文：AES-GCM，ciphertext 尾部自带 16 字节 tag（与 Web Crypto 的 data 参数一致）
 * - base64 为标准编码（带 padding），不是 URL-safe
 *
 * 本文件不依赖 DOM，可在 Node 中直接测试跨语言兼容性。
 */

export type Envelope = {
  v: number;
  kdf: { alg: string; iterations: number; salt: string };
  cipher: { alg: string; iv: string; tagBits: number };
  data: string;
};

const KDF_ALG = "PBKDF2-HMAC-SHA256";
const CIPHER_ALG = "AES-256-GCM";
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 2_000_000;

export class DecryptError extends Error {
  constructor(message = "密码错误或数据损坏") {
    super(message);
    this.name = "DecryptError";
  }
}

export function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export function parseEnvelope(raw: unknown): Envelope {
  const env = raw as Envelope;
  if (!env || env.v !== 1) throw new DecryptError("不支持的数据格式");
  if (env.kdf?.alg !== KDF_ALG) throw new DecryptError("不支持的密钥派生算法");
  if (env.cipher?.alg !== CIPHER_ALG) throw new DecryptError("不支持的加密算法");
  const it = env.kdf.iterations;
  if (!Number.isInteger(it) || it < MIN_ITERATIONS || it > MAX_ITERATIONS) {
    throw new DecryptError("密钥派生参数异常");
  }
  if (!env.kdf.salt || !env.cipher.iv || !env.data) throw new DecryptError("数据不完整");
  return env;
}

async function importPbkdf2Key(password: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
}

/** 派生 32 字节原始密钥（「记住本机」需要存它，而不是存密码） */
export async function deriveRawKey(
  password: string,
  kdf: Envelope["kdf"],
): Promise<Uint8Array<ArrayBuffer>> {
  const baseKey = await importPbkdf2Key(password);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: b64ToBytes(kdf.salt),
      iterations: kdf.iterations,
      hash: "SHA-256",
    },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

export async function importAesKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["decrypt"]);
}

export async function deriveKey(password: string, kdf: Envelope["kdf"]): Promise<CryptoKey> {
  return importAesKey(await deriveRawKey(password, kdf));
}

export async function decryptEnvelope<T>(env: Envelope, key: CryptoKey): Promise<T> {
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64ToBytes(env.cipher.iv), tagLength: 128 },
      key,
      b64ToBytes(env.data),
    );
  } catch {
    throw new DecryptError();
  }
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** 仅用于本地测试/工具：浏览器端生产流程不需要加密 */
export async function encryptJson(obj: unknown, password: string, kdf?: Envelope["kdf"]): Promise<Envelope> {
  const salt = kdf ? b64ToBytes(kdf.salt) : crypto.getRandomValues(new Uint8Array(16));
  const iterations = kdf?.iterations ?? 600_000;
  const meta = { alg: KDF_ALG, iterations, salt: bytesToB64(salt) };
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password.normalize("NFKC")),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"],
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = enc.encode(JSON.stringify(obj));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, plain);
  return {
    v: 1,
    kdf: meta,
    cipher: { alg: CIPHER_ALG, iv: bytesToB64(iv), tagBits: 128 },
    data: bytesToB64(new Uint8Array(data)),
  };
}

/** 同盐同迭代数的信封共用一个派生密钥 */
export async function decryptMany(
  password: string,
  envelopes: (Envelope | null)[],
): Promise<unknown[]> {
  const keyCache = new Map<string, Promise<CryptoKey>>();
  const out: unknown[] = [];
  for (const env of envelopes) {
    if (!env) {
      out.push(null);
      continue;
    }
    const cacheKey = `${env.kdf.salt}:${env.kdf.iterations}`;
    let keyPromise = keyCache.get(cacheKey);
    if (!keyPromise) {
      keyPromise = deriveKey(password, env.kdf);
      keyCache.set(cacheKey, keyPromise);
    }
    out.push(await decryptEnvelope(env, await keyPromise));
  }
  return out;
}
