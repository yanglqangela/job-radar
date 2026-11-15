/**
 * DeepSeek SSE 解析测试（本地 mock 服务器，不消耗真实额度）
 * 运行：node --experimental-strip-types tests/test_stream_parse.mjs
 */

import assert from "node:assert/strict";
import http from "node:http";
import { DeepSeekError, streamChat } from "../web/src/lib/deepseek.ts";

const encoder = JSON.stringify({ choices: [{ delta: { content: "你好" } }] });
const event = `data: ${encoder}\n\n`;

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    if ((req.url || "").includes("fail401")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "bad key" } }));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/event-stream" });
    // 故意把一个事件拆成两半分两次写，验证缓冲区拼接
    res.write(event.slice(0, 12));
    setTimeout(() => {
      res.write(event.slice(12));
      res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: "，世界" } }] })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }, 10);
  });
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

const deltas = [];
const full = await streamChat({
  baseUrl,
  apiKey: "test",
  model: "deepseek-chat",
  messages: [{ role: "user", content: "hi" }],
  onDelta: (d) => deltas.push(d),
});

assert.equal(full, "你好，世界");
assert.deepEqual(deltas, ["你好", "，世界"]);
console.log("✓ 流式内容与分帧正确（含跨 chunk 事件）");

await assert.rejects(
  () =>
    streamChat({
      baseUrl: `${baseUrl}/fail401`,
      apiKey: "test",
      model: "deepseek-chat",
      messages: [{ role: "user", content: "hi" }],
      onDelta: () => {},
    }),
  (err) => err instanceof DeepSeekError && /API Key/.test(err.message),
);
console.log("✓ 401 错误映射正确");

server.close();
console.log("SSE 解析测试通过");
