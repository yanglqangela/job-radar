# 求职雷达 · Job Radar

站点首页是**个人作品集**（简历 + 项目，公开访问，滚动叙事）；求职雷达工作台在 `#/unlock` 后面，需要密码。

一个**不用服务器**的个人求职工作台：GitHub Actions 每天抓岗位并按你的简历/项目打分，推送到企业微信；GitHub Pages 提供一个手机友好的网页，支持岗位日报、收藏/已投标记，以及基于你知识库的问答。

> 个人数据（简历、知识库、岗位）以 **AES-256-GCM 密文**存放在公开仓库里，网页输入密码后在浏览器本地解密。密码和 API Key 都不会上传。
> 作品集内容则是**明文公开**的，单独放在 `content/portfolio.json`，不包含手机号等联系方式。

```
GitHub Actions (daily)                         GitHub Pages (静态站)
  ├─ 解密 profile.enc.json                       ├─ #/        公开作品集（简历 + 项目）
  ├─ Tavily 两路搜索最新 JD                       └─ #/unlock  工作台（密码后）
  ├─ 去重 → LLM 粗筛 → 抓取 JD → LLM 结构化和打分     ├─ 今日/历史岗位、收藏、已投
  ├─ Top 5 推送企业微信                              └─ 问答：BM25 检索 → 浏览器直连 DeepSeek
  └─ 写 digest.enc.json + meta.json → commit
```

## 为什么是这套架构

- **零服务器成本**：公开仓库的 Actions 分钟数免费、Pages 免费。
- **不需要常驻后端**：DeepSeek API 支持浏览器 CORS，问答直接从前端调用。
- **公开仓库不泄露隐私**：所有个人数据加密后才提交；仓库里只有密文。
- **数据可追溯**：每天的岗位快照就是一个 commit，历史可回滚。

## 目录

```
scripts/
  crypto.py                 加密信封（PBKDF2 600k + AES-GCM），与前端逐字节兼容
  export_from_lq_agent.py   从本机 lq-agent 导出简历+知识库 → profile.enc.json
  build_portfolio.py        合并手写作品集与简历导出 → portfolio.json
  daily_jobs.py             每日管线入口（dry-run / no-push / no-write）
  rotate_password.py        轮换站点密码
  pipeline/                 搜索/去重/抓取/LLM/匹配/推送
content/portfolio.json      作品集手写内容（公开、tracked）
web/                        Vite + React + TS 静态站
  public/data/              portfolio.json / profile.enc.json / digest.enc.json / meta.json
  public/assets/            作品集截图与 og.png
tests/                      Python 单测 + Node 跨语言加密测试 + 冒烟测试
examples/profile.example.json  手填 profile 的模板
.github/workflows/          deploy.yml / daily.yml / ci.yml
```

## 作品集首页

站点打开就是作品集，不需要密码。内容分两部分：

- **手写部分**：`content/portfolio.json` 里的 hero、项目故事、技能分组、SEO、公开邮箱。改完运行：
  ```bash
  python scripts/build_portfolio.py
  git add content/portfolio.json web/public/data/portfolio.json
  git commit -m "content: update portfolio" && git push
  ```
- **经历部分**：可选地从 lq-agent 导出。先运行
  `export_from_lq_agent.py --plain-out` 生成 `data/profile.json`（已 gitignore），再运行
  `build_portfolio.py`，工作/教育/奖项会自动并进来；手写条目优先，未匹配的项目不会自动公开。

**公开邮箱**：填写 `content/portfolio.json` 的 `contact.email` 后重新生成。留空时页面显示「邮箱待补充」。
构建脚本会清洗自由文本里的手机号、邮箱、座机、身份证和 QQ/微信标识；输出只保留 allowlist 字段。

**加项目截图**：把图片放到 `web/public/assets/projects/<slug>/`（建议 1600px 宽、WebP/AVIF、16:10、<300KB），
然后在对应项目的 `screenshots` 里写相对路径：

```json
"screenshots": [{ "src": "assets/projects/lq-agent/overview.webp", "alt": "简历与 JD 匹配界面" }]
```

缺失或路径不合法的截图会在构建时给出警告并被跳过，卡片回落到排版样式。跑 `--strict` 可以把警告变成错误。

**校验**：`python scripts/build_portfolio.py --check` 会比对已提交的 `portfolio.json` 与内容文件，CI 里会跑。
`--validate-only` 只校验不写文件。


## 一次性配置

### 1. 创建仓库并打开 Pages

把本仓库推到 GitHub（公开），然后：

- **Settings → Pages → Source** 选择 **GitHub Actions**。
- 项目站点地址：`https://<你的用户名>.github.io/<仓库名>/`
- 如果是 `<用户名>.github.io` 仓库或绑定自定义域名，在 **Settings → Variables** 设置 `PAGES_BASE=/`。

### 2. 准备企业微信群机器人

企业微信群 → 群设置 → 群机器人 → 添加机器人 → 复制 Webhook 地址
（形如 `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx`）。

### 3. 配置 GitHub Secrets / Variables

在 **Settings → Secrets and variables → Actions** 中添加：

| 类型 | 名称 | 说明 |
|---|---|---|
| Secret | `SITE_PASSWORD` | 站点密码，**强随机**（`python scripts/crypto.py gen-password`） |
| Secret | `TAVILY_API_KEY` | Tavily 搜索 Key（免费额度 1000 次/月） |
| Secret | `LLM_API_KEY` | DeepSeek（或其它 OpenAI 兼容）API Key |
| Secret | `WECHAT_WEBHOOK_URL` | 企业微信群机器人 Webhook |
| Variable | `LLM_BASE_URL` | 可选，默认 `https://api.deepseek.com` |
| Variable | `LLM_MODEL` | 可选，默认 `deepseek-chat` |
| Variable | `SITE_URL` | 可选，推送消息底部的链接；站点首页现在是作品集，建议填 `https://<user>.github.io/<repo>/#/today` |
| Variable | `PAGES_BASE` | 可选，用户站点/自定义域名时设为 `/` |

也可以用 `gh` 设置：

```bash
gh secret set SITE_PASSWORD
gh secret set TAVILY_API_KEY
gh secret set LLM_API_KEY
gh secret set WECHAT_WEBHOOK_URL
gh variable set SITE_URL --body "https://<user>.github.io/<repo>/#/today"
```

### 4. 导出你的简历与知识库

这一步需要本机运行了 [lq-agent](https://github.com/yanglqangela/agent)（默认 `http://localhost:8083`）。

先找到 user_id：

```bash
docker exec lq-postgres psql -U lqagent -d lq_agent -c "select id, username from users"
```

然后（密码与 GitHub Secret `SITE_PASSWORD` 必须一致）：

```bash
# Linux/macOS
export SITE_PASSWORD='你的站点密码'
# Windows PowerShell
# $env:SITE_PASSWORD="你的站点密码"

python -m pip install -r requirements.txt
python scripts/export_from_lq_agent.py --user-id 1 \
  --keywords "AI应用开发,AI产品经理" --city "杭州,上海"
```

输出：

- `web/public/data/profile.enc.json`（加密，提交）
- `web/public/data/digest.enc.json`（初始空数据，提交）
- `data/profile.json`（仅加 `--plain-out` 时生成，已 gitignore）

确认无手机号/邮箱后提交并推送：

```bash
git add web/public/data
git commit -m "chore(data): export profile"
git push
```

> 如果暂时不想启动 lq-agent，可以复制 `examples/profile.example.json` 手填后自行加密：
> `python scripts/crypto.py encrypt --in data/profile.json --out web/public/data/profile.enc.json --password-env SITE_PASSWORD`

### 5. 第一次运行

- Actions → **daily** → Run workflow（先勾 `dry_run=true` 检查日志，再正式跑）。
- 正式跑后：企业微信收到推荐；`digest.enc.json` 有新提交；Pages 自动更新。
- 手机打开站点：首页是公开作品集；进入「求职工作台」后输入 `SITE_PASSWORD` 解锁岗位日报。

## 本地开发

```bash
# 生成/更新公开作品集（不需要密码）
python scripts/build_portfolio.py

# 生成假数据预览工作台（密码 demo1234）
DEMO_PASSWORD=demo1234 python tests/gen_demo_data.py

cd web
npm install
npm run dev          # http://localhost:5173/#/ 是作品集，#/today 是工作台
npm run build        # 产物在 web/dist
```

> 正式部署前请重新运行导出脚本，覆盖演示数据。`gen_demo_data.py` 只覆盖加密文件，不影响 `portfolio.json`。

### 本地跑每日管线

```bash
# Windows PowerShell
$env:SITE_PASSWORD="..."; $env:TAVILY_API_KEY="..."; $env:LLM_API_KEY="..."
# 只跑不写不推
python scripts/daily_jobs.py --dry-run

# 写文件但不推送
python scripts/daily_jobs.py --no-push
```

管线会打印计数与异常类型，**不会打印公司/岗位/技能/URL/解密内容**——因为公开仓库的 Actions 日志是公开的。

## 测试

```bash
python -m pytest tests -q
node --experimental-strip-types tests/test_crypto_webcrypto.mjs   # Python <-> Web Crypto 互解
node --experimental-strip-types tests/test_web_smoke.mjs          # 解密 + BM25 冒烟
cd web && npm run build
```

## 轮换站点密码

```bash
SITE_PASSWORD_OLD='旧密码' SITE_PASSWORD_NEW='新密码' python scripts/rotate_password.py
```

然后更新 GitHub Secret `SITE_PASSWORD` 并提交新的加密文件。旧密码立即失效。

## 数据与隐私

- **加密**：PBKDF2-HMAC-SHA256（600,000 次）派生 256-bit 密钥，AES-GCM 加密；参数写在信封里，Python 与浏览器实现互通。
- **不导出**：手机号、邮箱、原始简历全文、头像、LLM Key。
- **不存储**：密码不写入任何地方；「记住本机」只保存派生密钥（可在设置中取消）。
- **网络**：页面不加载任何第三方脚本/字体/统计；问答请求只发往你配置的模型服务。
- **注意事项**：密文在公开仓库，密码强度就是唯一防线，请使用 `python scripts/crypto.py gen-password` 生成的强随机密码。

## 常见问题

**解锁提示「密码错误或数据损坏」**
检查 GitHub Secret 与导出时使用的 `SITE_PASSWORD` 是否一致（大小写、空白）；如果是轮换后的密码，需要重新导出或运行 `rotate_password.py`。

**网页显示「站点还没有数据」**
还没有提交 `profile.enc.json`，先完成「导出」步骤。

**Actions 的 daily 失败了**
- `配置错误: 缺少环境变量` → 缺少 Secret；
- `搜索不可用` → Tavily Key 无效或额度用尽；
- `推送失败` → Webhook 地址错误/被限频；
- `缺少 profile.enc.json` → 未导出。

**企业微信没收到消息**
当天没有新岗位时不会推送（避免噪音）；也可以手动 dispatch 并查看日志。GitHub 定时任务可能延迟 10–30 分钟。

**Pages 打开是 404 / 白屏**
确认 Pages Source 是 **GitHub Actions**，且 `PAGES_BASE` 与仓库类型匹配（项目站点默认 `/<repo>/`，用户站点/自定义域名用 `/`）。

**国内访问 `github.io` 慢**
首次访问可能较慢；可以绑定自定义域名（Pages 免费支持），或等 CDN 缓存。

## 成本

| 项目 | 费用 |
|---|---|
| GitHub Actions（公开仓库） | 免费 |
| GitHub Pages | 免费 |
| Tavily | 免费额度 1000 次/月（每日约 10 次） |
| DeepSeek | 按量计费，每日一轮约几分钱 |

## 不在范围内

- 部署完整的 lq-agent（Java + Python + PostgreSQL），需要服务器；
- 自动投递、定向简历生成等需要后端的操作；
- 多用户与账号体系。

## 备选发布方式（Actions 不可用时）

如果 GitHub 账户因账单/额度问题锁定 Actions（日志提示 `your account is locked due to a billing issue`），
站点仍可通过 **gh-pages 分支**发布：

```bash
# 1. 仓库 Settings → Pages → Source 选择 gh-pages 分支
# 2. 每次更新数据后：
python scripts/export_from_lq_agent.py --user-id <ID> ...
python scripts/publish_site.py        # 构建并推送 gh-pages
```

账单恢复后，建议切换回 Actions 自动部署：

```bash
printf '%s' '{"build_type":"workflow"}' | gh api -X PUT repos/<owner>/job-radar/pages --input -
gh workflow run deploy.yml --repo <owner>/job-radar
```
