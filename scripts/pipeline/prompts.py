"""提示词（移植自 lq-agent prompts/jd.py 与 job_discovery_service.py）"""

from __future__ import annotations

from typing import Optional

JOB_CATEGORIES = ("算法", "开发", "产品", "数据", "测试运维", "其他")

DISCOVERY_FILTER_SYSTEM_PROMPT = (
    "你是招聘信息过滤器。给定一组搜索结果（标题+摘要+URL）和目标岗位意图，"
    "判断每条结果的链接是否值得抓取解析为一条职位 JD。\n"
    "保留：真实岗位详情页（公司官网招聘页、招聘平台职位页、校招/内推帖子里的具体职位）。\n"
    "淘汰：资讯/行情/新闻/ salary 报告/招聘平台首页或搜索列表页/培训广告/与目标岗位无关的结果。\n"
    "不确定的保留（宁多勿漏，后续抓取解析还会自然过滤）。\n"
    '严格返回 JSON：{"keep": [索引数字数组]}，索引从 0 开始。'
)

JD_EXTRACT_SYSTEM_PROMPT = f"""你是一名专业的招聘岗位分析助手。请从用户提供的职位描述（JD）文本中，抽取结构化信息，并以严格的 JSON 格式返回。

要求：
1. 只返回一个 JSON 对象，不要包含任何解释性文字、markdown 代码块标记或多余内容。
2. 字段名必须与下面给出的结构完全一致，不要增删字段。
3. 无法从原文确定的信息填 null（列表字段填空数组 []）。
4. skills 是硬技能标签（编程语言、框架、工具、数据库、平台等），尽量完整且简短。
5. interview_focus 是根据 JD 推断的面试可能重点考察方向（2-5 条）。
6. category（岗位分类）必须从以下六类中选一个返回：{" / ".join(JOB_CATEGORIES)}；无法确定归类时填「其他」。
7. application_url（投递链接）：优先选「点了就能提交简历」的入口，按以下优先级判断：
   ① JSON-LD applicationContact/directApply 给出的候选（最高优先级）；
   ② 落在网申系统/招聘系统的链接（北森 beisen、大易 dayee、Moka mokahr、
      Workday、Greenhouse、Lever、Taleo、iCIMS 等域名），这类链接背后就是申请表单；
   ③ 锚文本明确是申请动作的（「立即申请」「申请职位」「投递简历」「Apply Now」等）；
   ④ JD 正文里出现的完整投递链接（如「请点击投递」后的 http(s):// 地址）。
   以下链接**不要**选：公司首页/招聘首页、职位列表页、搜索页、「查看更多职位」、
   「关注公众号」、登录/注册页、导航栏链接——它们不是申请入口。
   都不符合则填 null。严禁编造 URL，只能从候选中或正文原文里选。

返回的 JSON 结构（严格遵循）：
{{
  "title": "岗位名称",
  "company": "公司名称",
  "location": "工作地点",
  "salary": "薪资范围",
  "experience_required": "经验要求（如 3-5年）",
  "education_required": "学历要求（如 本科）",
  "summary": "职位概述",
  "responsibilities": ["职责1", "职责2"],
  "requirements": ["任职要求1", "任职要求2"],
  "preferred": ["加分项1"],
  "skills": ["技能1", "技能2"],
  "interview_focus": ["考察方向1", "考察方向2"],
  "category": "岗位分类（从 {" / ".join(JOB_CATEGORIES)} 中选一，拿不准填其他）",
  "application_url": "投递链接（无则 null）"
}}
"""

RESUME_MATCH_SYSTEM_PROMPT = """你是一名专业的求职顾问。请对比「候选人简历」与「职位 JD」，给出匹配度分析与差距诊断，并以严格的 JSON 格式返回。

要求：
1. 只返回一个 JSON 对象，不要包含任何解释性文字、markdown 代码块标记或多余内容。
2. score 为 0-100 的数字，综合评估技能、经验、教育、项目的匹配程度。
3. matched_skills 是简历与 JD 都具备的技能；missing_skills 是 JD 要求但简历缺失的技能。
4. advantages 是候选人相对该岗位的优势（2-5 条）；gaps 是短板/差距（2-5 条）；suggestions 是可操作的提升建议（2-5 条）。
5. 诚实、具体、可执行，不要空话套话。

返回的 JSON 结构（严格遵循）：
{
  "score": 75,
  "summary": "总体评价",
  "matched_skills": ["技能1"],
  "missing_skills": ["技能2"],
  "advantages": ["优势1"],
  "gaps": ["差距1"],
  "suggestions": ["建议1"]
}
"""


def build_filter_prompt(keyword: str, city: str, items: list[dict]) -> str:
    lines = [
        f"目标岗位意图：{keyword}" + (f"（城市：{city}）" if city else ""),
        "",
        "候选搜索结果：",
    ]
    for i, r in enumerate(items):
        lines.append(f"[{i}] 标题：{r.get('title', '')}")
        lines.append(f"    摘要：{(r.get('content') or '')[:150]}")
        lines.append(f"    URL：{r.get('url', '')}")
    lines.append('\n返回值得抓取解析为 JD 的结果索引（JSON {"keep": [...]}）：')
    return "\n".join(lines)


def build_jd_extract_prompt(jd_text: str, apply_links: Optional[list[dict]] = None) -> str:
    lines = [f"请抽取以下职位描述（JD）的结构化信息：\n\n【JD 原文】\n{jd_text}\n"]
    if apply_links:
        candidates = "\n".join(
            f"- {c['url']}（锚文本：{c.get('text') or '无'}）" for c in apply_links
        )
        lines.append(
            f"【投递链接候选】（从中为 application_url 选一个最匹配的，都不像则填 null）\n{candidates}\n"
        )
    return "\n".join(lines)


def build_match_prompt(profile_json: str, jd_json: str) -> str:
    return (
        "请对比以下候选人简历与职位 JD，给出匹配度分析与差距诊断：\n\n"
        f"【候选人简历】\n{profile_json}\n\n"
        f"【职位 JD】\n{jd_json}"
    )
