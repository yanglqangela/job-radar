# 作品集怎么增加项目或经历

作品的公开内容都在 `content/portfolio.json`。改完运行两条命令，再发布。

## 1. 先改内容

### 加一个项目

在 `content/portfolio.json` 的 `projects` 数组里加一项。最少要有 `slug`、`name`、`pitch`；其余字段按需填：

```json
{
  "slug": "my-new-project",
  "name": "项目中文名",
  "nameEn": "Project Name",
  "year": "2026",
  "pitch": "一句话说清楚这个项目解决什么问题。",
  "problem": "背景和约束，2–4 句。",
  "role": "你在这个项目里具体做了什么。",
  "decisions": [
    { "title": "关键决策标题", "detail": "为什么这么选，代价是什么。" }
  ],
  "backend": [
    { "title": "后台能力标题", "detail": "后台具体能做什么，没有就删掉 backend。" }
  ],
  "stack": ["React", "FastAPI", "PostgreSQL"],
  "highlights": ["结果 1", "结果 2"],
  "metrics": [
    { "value": "49", "label": "在管商品" }
  ],
  "links": [
    { "label": "访问官网", "url": "https://example.com" }
  ],
  "screenshots": [
    {
      "src": "assets/projects/my-new-project/cover.jpg",
      "alt": "项目封面",
      "caption": "官网首页"
    }
  ]
}
```

规则：

- `slug` 只能是小写字母、数字和短横线，不能重复。
- `links` 只放 http/https/mailto。
- `screenshots[].src` 是相对 `web/public` 的路径，文件必须真实存在。支持 `.png/.jpg/.jpeg/.webp/.avif/.gif`。
- 项目详情页会自动使用这些字段；首页目前使用项目示意图或封面图。
- 想让首页卡片和详情页都有图，把图片放到 `web/public/assets/projects/<slug>/`，再把路径写进 `screenshots`。

### 加一段经历

在 `timeline.items` 里加一项：

```json
{
  "kind": "work",
  "period": "2026.08 — 至今",
  "org": "公司名",
  "role": "岗位",
  "roleEn": "Role",
  "location": "城市",
  "bullets": ["做了什么，结果是什么"],
  "tags": ["Agent", "Python"]
}
```

教育经历用 `"kind": "education"`。奖项和证书放在 `timeline.compactItems`。

### 技能

`skills.groups[].items[]` 里的 `evidence` 可以写项目 slug，技能页会变成可点击跳转的链接。指向不存在的 slug 会在校验时报错。

## 2. 生成并校验公开数据

在 `job-radar/` 根目录：

```bash
python scripts/build_portfolio.py
python scripts/build_portfolio.py --check
```

第二条命令会校验 slug、链接、截图文件、技能 evidence 等。必须通过。

## 3. 本地预览

```bash
cd web
npm run dev
```

或者构建后预览：

```bash
cd web
npm run build
npm run preview
```

## 4. 发布

### 服务器

```bash
cd web
npm run build
tar -czf /tmp/site.tgz -C dist .
scp /tmp/site.tgz root@8.148.67.50:/tmp/
ssh root@8.148.67.50
# 登录后执行：
rm -rf /opt/apps/job-radar-site-new
mkdir -p /opt/apps/job-radar-site-new
tar -xzf /tmp/site.tgz -C /opt/apps/job-radar-site-new
mv /opt/apps/job-radar-site /opt/apps/job-radar-site-old
mv /opt/apps/job-radar-site-new /opt/apps/job-radar-site
rm -rf /opt/apps/job-radar-site-old
cd /opt/apps/stack && docker compose restart web
```

### GitHub Pages

```bash
python scripts/publish_site.py
```

## 5. 两个容易忘的部分

- **加密工作台**：`web/public/data/profile.enc.json` / `digest.enc.json` 是单独导出的，不会因为改 `content/portfolio.json` 自动更新。改简历/工作台数据用 `scripts/export_from_lq_agent.py` 或 `scripts/rotate_password.py`，然后重新发布。
- **公开 Agent 知识库**：`/#/agent` 回答的是 `public_kb.json` 里那 12 条公开资料，不会自动跟着作品集更新。加了新项目后如果希望 Agent 也能回答，需要重新生成知识库并重灌（可以让我来做）。

## 6. 图片建议

- 封面 16:10，宽度 1200–1600px，控制在一张 300KB 以内。
- 优先用真实界面截图；没有截图时用项目示意图或设计过的封面，不要用通用图库图。
- 截图里不要带客户姓名、邮箱、电话、内部 URL 和账号。
