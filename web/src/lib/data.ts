/** 数据加载：meta 明文心跳 + 两个加密文件 */

import { decryptEnvelope, decryptMany, parseEnvelope, type Envelope } from "./crypto";
import type { Digest, Meta, Profile } from "../types";

const BASE = import.meta.env.BASE_URL;

export const EMPTY_DIGEST: Digest = {
  schemaVersion: 1,
  generatedAt: "",
  runDate: "",
  run: {
    status: "ok",
    counts: { searched: 0, newCandidates: 0, fetched: 0, matched: 0, pushed: 0 },
    degradedReasons: [],
  },
  jobs: [],
};

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BASE}${path}?ts=${Date.now()}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`加载 ${path} 失败：HTTP ${res.status}`);
  return (await res.json()) as T;
}

export async function loadMeta(): Promise<Meta | null> {
  try {
    return await fetchJson<Meta>("data/meta.json");
  } catch {
    return null;
  }
}

export async function loadEnvelopes(): Promise<{
  profile: Envelope | null;
  digest: Envelope | null;
}> {
  const [profile, digest] = await Promise.all([
    fetchJson<Envelope>("data/profile.enc.json"),
    fetchJson<Envelope>("data/digest.enc.json"),
  ]);
  return {
    profile: profile ? parseEnvelope(profile) : null,
    digest: digest ? parseEnvelope(digest) : null,
  };
}

export async function decryptWithKey(
  key: CryptoKey,
  envelopes: { profile: Envelope | null; digest: Envelope | null },
): Promise<{ profile: Profile; digest: Digest }> {
  if (!envelopes.profile) {
    throw new Error("尚未导出个人资料（profile.enc.json）");
  }
  const profile = await decryptEnvelope<Profile>(envelopes.profile, key);
  const digest = envelopes.digest
    ? await decryptEnvelope<Digest>(envelopes.digest, key)
    : EMPTY_DIGEST;
  return { profile, digest: { ...EMPTY_DIGEST, ...digest } };
}

/** 按每个信封自己的 salt/iterations 派生（profile 与 digest 的 KDF 可能不同） */
export async function decryptWithPassword(
  password: string,
  envelopes: { profile: Envelope | null; digest: Envelope | null },
): Promise<{ profile: Profile; digest: Digest }> {
  if (!envelopes.profile) {
    throw new Error("尚未导出个人资料（profile.enc.json）");
  }
  const [profile, digest] = (await decryptMany(password, [
    envelopes.profile,
    envelopes.digest,
  ])) as [Profile, Digest | null];
  return {
    profile,
    digest: digest ? { ...EMPTY_DIGEST, ...digest } : EMPTY_DIGEST,
  };
}

export function siteUrl(): string {
  return `${window.location.origin}${BASE.replace(/\/$/, "")}/`;
}
