/**
 * 前端数据链路冒烟测试（Node）：
 * 演示加密数据 -> Web Crypto 解密 -> BM25 检索
 *
 * 运行：node --experimental-strip-types tests/test_web_smoke.mjs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decryptEnvelope,
  deriveRawKey,
  importAesKey,
  parseEnvelope,
} from "../web/src/lib/crypto.ts";
import { buildIndexFor, retrieve } from "../web/src/lib/rag.ts";

const PASSWORD = process.env.DEMO_PASSWORD || "demo1234";
const DATA = new URL("../web/public/data/", import.meta.url);

const profileEnv = parseEnvelope(JSON.parse(readFileSync(new URL("profile.enc.json", DATA), "utf8")));
const digestEnv = parseEnvelope(JSON.parse(readFileSync(new URL("digest.enc.json", DATA), "utf8")));

const raw = await deriveRawKey(PASSWORD, profileEnv.kdf);
const key = await importAesKey(raw);
const profile = await decryptEnvelope(profileEnv, key);
const digest = await decryptEnvelope(digestEnv, key);

assert.equal(profile.schemaVersion, 1);
assert.ok(profile.sections.projects.length >= 1);
assert.ok(digest.jobs.length >= 1);
console.log(`✓ 解密成功：${profile.sections.projects.length} 个项目 / ${digest.jobs.length} 个岗位`);

const index = buildIndexFor(profile, digest);
assert.ok(index.docs.length >= digest.jobs.length);

const { hits, sources } = retrieve(index, "我的项目用了什么技术栈", 6);
assert.ok(hits.length > 0, "检索应当有命中");
assert.ok(sources.length > 0);
console.log(`✓ 检索命中 ${hits.length} 条，来源示例：${sources[0].label}`);

console.log("前端数据链路冒烟测试通过");
