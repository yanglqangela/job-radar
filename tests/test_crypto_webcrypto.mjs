/**
 * 跨语言加密兼容测试（Node Web Crypto 侧）
 *
 * 运行：node tests/test_crypto_webcrypto.mjs
 * 依赖：Node >= 22.6（原生 TypeScript type stripping）
 *
 * 覆盖：
 * 1. Python(cryptography) 生成的信封 -> Web Crypto 解密
 * 2. Web Crypto 生成的信封 -> 写入 fixtures/crypto_vector_node.json，由 pytest 反向解密
 * 3. 错误密码必须失败
 */

import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  decryptEnvelope,
  deriveKey,
  encryptJson,
  parseEnvelope,
  DecryptError,
} from "../web/src/lib/crypto.ts";

const FIXTURE = new URL("./fixtures/crypto_vector.json", import.meta.url);
const NODE_FIXTURE = new URL("./fixtures/crypto_vector_node.json", import.meta.url);

const fx = JSON.parse(readFileSync(FIXTURE, "utf8"));

// 1) Python -> Node
{
  const env = parseEnvelope(fx.envelope);
  const key = await deriveKey(fx.password, env.kdf);
  const out = await decryptEnvelope(env, key);
  assert.deepEqual(out, fx.plaintext);
  console.log("✓ Python 加密 -> Web Crypto 解密");
}

// 2) Node -> fixtures（供 pytest 反向验证）
{
  const salt = new Uint8Array([
    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
  ]);
  const saltB64 = Buffer.from(salt).toString("base64");
  const env = await encryptJson(fx.plaintext, fx.password, {
    alg: "PBKDF2-HMAC-SHA256",
    iterations: 100_000,
    salt: saltB64,
  });
  const key = await deriveKey(fx.password, env.kdf);
  const roundtrip = await decryptEnvelope(env, key);
  assert.deepEqual(roundtrip, fx.plaintext);

  writeFileSync(
    NODE_FIXTURE,
    JSON.stringify(
      { password: fx.password, iterations: 100_000, plaintext: fx.plaintext, envelope: env },
      null,
      2,
    ) + "\n",
  );
  console.log("✓ Web Crypto 加密 -> 已写入 node fixture");
}

// 3) 错误密码
{
  const env = parseEnvelope(fx.envelope);
  const key = await deriveKey("wrong-password", env.kdf);
  await assert.rejects(() => decryptEnvelope(env, key), DecryptError);
  console.log("✓ 错误密码被拒绝");
}

console.log("跨语言加密测试全部通过");
