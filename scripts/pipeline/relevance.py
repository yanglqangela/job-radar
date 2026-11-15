"""链接相关性与公司/岗位归一化（移植自 lq-agent job_search_service.py）"""

from __future__ import annotations

import re
from urllib.parse import urlparse

# 主流招聘平台域名（职位详情页；官方站不在其中）
PLATFORM_DOMAINS = (
    "zhipin.com",
    "liepin.com",
    "zhaopin.com",
    "51job.com",
    "chinasofti.com",
    "nowcoder.com",
    "shixiseng.com",
    "lagou.com",
    "jobui.com",
    "zhipinimg.com",
)

# 网申系统（ATS）域名：命中即等同于「这里就是申请入口」
ATS_DOMAINS = (
    "beisen.com",
    "dayee.com",
    "mokahr.com",
    "hotjob.cn",
    "myworkdayjobs.com",
    "workday.com",
    "greenhouse.io",
    "lever.co",
    "smartrecruiters.com",
    "ashbyhq.com",
    "icims.com",
    "taleo.net",
    "successfactors.com",
    "workable.com",
    "jobvite.com",
    "bamboohr.com",
)

_APPLY_PATH_HINTS = ("/apply", "/application", "/submit", "/toudi", "/deliver")

_HIGH_INTENT_ANCHORS = (
    "立即申请",
    "申请职位",
    "申请该职位",
    "投递简历",
    "立即投递",
    "马上申请",
    "马上投递",
    "在线申请",
    "投递该职位",
    "我要申请",
    "网申",
    "简历投递",
    "apply now",
    "apply for this job",
    "apply online",
    "submit application",
    "quick apply",
    "easy apply",
    "apply",
)

_MID_INTENT_ANCHORS = (
    "投递",
    "申请",
    "应聘",
    "报名",
    "职位",
    "position",
    "job",
    "career",
    "join",
    "recruit",
)

_NAVIGATION_HINTS = (
    "查看更多",
    "更多职位",
    "全部职位",
    "职位列表",
    "返回首页",
    "首页",
    "登录",
    "注册",
    "搜索结果",
    "搜索",
    "薪资",
    "行情",
    "培训",
    "关于我们",
    "新闻",
    "进度",
    "状态",
    "sign in",
    "log in",
    "register",
    "about",
    "news",
    "search",
    "home",
)


def host_of(url: str) -> str:
    try:
        return (urlparse(url).netloc or "").lower()
    except ValueError:
        return ""


def is_ats_host(host: str) -> bool:
    h = (host or "").lower()
    return any(h == d or h.endswith("." + d) for d in ATS_DOMAINS)


def is_platform_host(host: str) -> bool:
    h = (host or "").lower()
    return any(h == d or h.endswith("." + d) for d in PLATFORM_DOMAINS)


def norm_token(value) -> str:
    """公司/岗位名归一化：去掉公司后缀，只留字母数字汉字，用于匹配与去重"""
    text = re.sub(r"(有限公司|有限责任公司|股份有限公司|集团|控股|股份)", "", str(value or ""))
    return re.sub(r"[^0-9A-Za-z一-鿿]+", "", text).lower()


def relevance(primary: str, secondary: str, result: dict) -> float:
    """
    搜索结果相关性打分（相对分，不是绝对值）。

    primary/secondary 语义随场景变化：发现管线里通常是关键词/城市，
    投递链接场景里是公司/岗位。命中标题与摘要越完整分越高。
    """
    title = str(result.get("title") or "")
    content = str(result.get("content") or "")[:200]
    host = host_of(str(result.get("url") or ""))
    c = norm_token(primary)
    p = norm_token(secondary) if secondary else ""

    score = 0.0
    corpus = norm_token(title + " " + content)
    if c and c in corpus:
        score += 3.0
    if p and p in corpus:
        score += 2.0
    if c and p and c in norm_token(title) and p in norm_token(title):
        score += 2.0

    is_platform = any(host.endswith(d) for d in PLATFORM_DOMAINS)
    if not is_platform:
        if c and c in host:
            score += 4.0
        if c and c in corpus:
            score += 1.5
    elif c not in corpus:
        score -= 1.0

    if c and c not in corpus and c not in host:
        score -= 1.0
        if any(k in title for k in ("工资", "行情", "待遇", "新闻", "培训", "多少钱")):
            score -= 1.5
    if any(k in title for k in ("搜索", "职位搜索", "招聘网", "平台", "登录")):
        if c and c not in title:
            score -= 2.0
    return score


def is_apply_link_intent(text: str) -> bool:
    """锚文本是否是投递动作：明确申请，或模糊意图但不带导航特征"""
    t = (text or "").lower()
    high = any(k in t for k in _HIGH_INTENT_ANCHORS)
    if high:
        return True
    mid = any(k in t for k in _MID_INTENT_ANCHORS)
    nav = any(k in t for k in _NAVIGATION_HINTS)
    return mid and not nav


def looks_like_apply_path(path: str) -> bool:
    p = (path or "").lower()
    return any(k in p for k in _APPLY_PATH_HINTS)
