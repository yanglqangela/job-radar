import type { ReactElement } from "react";
import { useInView } from "../../hooks/useInView";
import { clsx } from "../../lib/util";

/**
 * 每个项目一张手绘技术示意图。
 * 它们不是装饰：图上的节点和连线就是项目里真实的服务、工具和决策。
 */

type DiagramDef = {
  label: string;
  caption: string;
  art: ReactElement;
};

function ArrowHead({ id }: { id: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M0 0 L10 5 L0 10 z" className="pf-dg-arrowhead" />
    </marker>
  );
}

const DIAGRAMS: Record<string, DiagramDef> = {
  "lq-agent": {
    label: "OfferPilot 系统结构图",
    caption:
      "浏览器 → Java 网关 → Python Agent。Java 只管 JWT 和账号，业务与模型调用全在 Python；自动填表必须由用户确认后提交。",
    art: (
      <svg
        className="pf-dg"
        viewBox="0 0 480 340"
        role="img"
        aria-label="OfferPilot 使用 Java 网关和 Python Agent 分工，简历导出和自动填表是两条独立支路"
      >
        <defs>
          <ArrowHead id="pf-dg-lq-arrow" />
        </defs>

        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M96 170 H116"
          markerEnd="url(#pf-dg-lq-arrow)"
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M212 170 H240"
          markerEnd="url(#pf-dg-lq-arrow)"
          style={{ transitionDelay: "140ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M360 135 C372 112 376 98 390 90"
          markerEnd="url(#pf-dg-lq-arrow)"
          style={{ transitionDelay: "280ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M300 230 V265"
          markerEnd="url(#pf-dg-lq-arrow)"
          style={{ transitionDelay: "400ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M360 250 C366 256 372 262 380 268"
          markerEnd="url(#pf-dg-lq-arrow)"
          style={{ transitionDelay: "500ms" }}
        />
        <path
          className="pf-dg-dash"
          d="M360 190 H380"
          markerEnd="url(#pf-dg-lq-arrow)"
        />

        <rect className="pf-dg-box" x="16" y="130" width="80" height="80" />
        <text className="pf-dg-title" x="56" y="164" textAnchor="middle">
          React
        </text>
        <text x="56" y="182" textAnchor="middle">
          前端
        </text>

        <rect className="pf-dg-box" x="116" y="130" width="96" height="80" />
        <text className="pf-dg-title" x="164" y="164" textAnchor="middle">
          Java 网关
        </text>
        <text x="164" y="182" textAnchor="middle">
          JWT · 账号
        </text>

        <rect className="pf-dg-box pf-dg-box--core" x="240" y="110" width="120" height="120" />
        <text className="pf-dg-title" x="300" y="144" textAnchor="middle">
          Python Agent
        </text>
        <text x="300" y="163" textAnchor="middle">
          LangGraph · 工具
        </text>
        <text x="300" y="182" textAnchor="middle">
          简历 · 岗位 · 面试
        </text>

        <rect className="pf-dg-box" x="390" y="52" width="74" height="40" />
        <text className="pf-dg-title" x="427" y="76" textAnchor="middle">
          LLM API
        </text>

        <rect className="pf-dg-box" x="255" y="265" width="90" height="40" />
        <text className="pf-dg-title" x="300" y="289" textAnchor="middle">
          PostgreSQL
        </text>

        <rect className="pf-dg-box" x="380" y="250" width="90" height="50" />
        <text className="pf-dg-title" x="425" y="271" textAnchor="middle">
          简历 PDF
        </text>
        <text x="425" y="288" textAnchor="middle">
          HTML → PDF
        </text>

        <rect className="pf-dg-box" x="380" y="165" width="90" height="50" />
        <text className="pf-dg-title" x="425" y="186" textAnchor="middle">
          自动填表
        </text>
        <text x="425" y="203" textAnchor="middle">
          人审后提交
        </text>
      </svg>
    ),
  },

  "kb-agent": {
    label: "DocQA 决策循环图",
    caption:
      "think → tool call → observation 的循环，每一步都写进 trace；步数和工具次数都有上限，超限明确返回 incomplete。",
    art: (
      <svg
        className="pf-dg"
        viewBox="0 0 480 340"
        role="img"
        aria-label="DocQA 的 think、tool call、observation 循环，工具结果统一信封，过程写入 trace"
      >
        <defs>
          <ArrowHead id="pf-dg-kb-arrow" />
        </defs>

        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M120 140 C146 116 148 94 175 76"
          markerEnd="url(#pf-dg-kb-arrow)"
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M230 95 V215"
          markerEnd="url(#pf-dg-kb-arrow)"
          style={{ transitionDelay: "180ms" }}
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M175 245 C148 230 128 208 120 195"
          markerEnd="url(#pf-dg-kb-arrow)"
          style={{ transitionDelay: "360ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M285 62 H335"
          markerEnd="url(#pf-dg-kb-arrow)"
          style={{ transitionDelay: "480ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M285 248 H335"
          markerEnd="url(#pf-dg-kb-arrow)"
          style={{ transitionDelay: "600ms" }}
        />

        <rect className="pf-dg-box" x="20" y="125" width="100" height="70" />
        <text className="pf-dg-title" x="70" y="153" textAnchor="middle">
          think
        </text>
        <text x="70" y="171" textAnchor="middle">
          决定下一步
        </text>

        <rect className="pf-dg-box" x="175" y="30" width="110" height="65" />
        <text className="pf-dg-title" x="230" y="56" textAnchor="middle">
          tool call
        </text>
        <text x="230" y="74" textAnchor="middle">
          选择工具
        </text>

        <rect className="pf-dg-box" x="175" y="215" width="110" height="65" />
        <text className="pf-dg-title" x="230" y="241" textAnchor="middle">
          observation
        </text>
        <text x="230" y="259" textAnchor="middle">
          读结果
        </text>

        <rect className="pf-dg-box pf-dg-box--core" x="335" y="30" width="125" height="90" />
        <text className="pf-dg-title" x="397" y="52" textAnchor="middle">
          kb_list
        </text>
        <text x="397" y="70" textAnchor="middle">
          kb_search
        </text>
        <text x="397" y="88" textAnchor="middle">
          kb_get
        </text>
        <text x="397" y="108" textAnchor="middle">
          统一信封
        </text>

        <rect className="pf-dg-box" x="335" y="225" width="125" height="70" />
        <text className="pf-dg-title" x="397" y="251" textAnchor="middle">
          trace 记录
        </text>
        <text x="397" y="269" textAnchor="middle">
          决策 + 结果
        </text>

        <g className="pf-dg-notes">
          <text className="pf-dg-note" x="238" y="158">
            下一轮
          </text>
          <text className="pf-dg-note" x="310" y="55" textAnchor="middle">
            调用
          </text>
          <text className="pf-dg-note" x="310" y="241" textAnchor="middle">
            写入
          </text>
          <text className="pf-dg-note" x="397" y="140" textAnchor="middle">
            ok / data / error.code
          </text>
        </g>

        <text className="pf-dg-note" x="20" y="310">
          预算：6 步 · 8 次工具 · 单步 3 次
        </text>
        <text className="pf-dg-note" x="20" y="327">
          超限 → incomplete，不假装答完
        </text>
      </svg>
    ),
  },

  "job-radar": {
    label: "求职雷达数据流图",
    caption:
      "GitHub Actions 每天抓取、打分、加密，Pages 只出静态站；每天的岗位快照就是一个 commit，密码只在浏览器本地解密。",
    art: (
      <svg
        className="pf-dg"
        viewBox="0 0 480 340"
        role="img"
        aria-label="求职雷达由 GitHub Actions 抓取打分并加密成密文，提交到 Pages 静态站，浏览器本地解密"
      >
        <defs>
          <ArrowHead id="pf-dg-jr-arrow" />
        </defs>

        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M166 160 H210"
          markerEnd="url(#pf-dg-jr-arrow)"
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M320 160 H360"
          markerEnd="url(#pf-dg-jr-arrow)"
          style={{ transitionDelay: "220ms" }}
        />
        <path
          className="pf-dg-dash"
          d="M412 190 V240"
          markerEnd="url(#pf-dg-jr-arrow)"
        />

        <rect className="pf-dg-box" x="16" y="60" width="150" height="200" />
        <text className="pf-dg-title" x="28" y="84">
          GitHub Actions
        </text>
        <line x1="36" y1="112" x2="36" y2="214" className="pf-dg-dash" />
        <circle className="pf-dg-dot" cx="36" cy="112" r="2.5" />
        <circle className="pf-dg-dot" cx="36" cy="146" r="2.5" />
        <circle className="pf-dg-dot" cx="36" cy="180" r="2.5" />
        <circle className="pf-dg-dot pf-dg-dot--signal" cx="36" cy="214" r="2.5" />
        <text x="50" y="117">Tavily 搜索</text>
        <text x="50" y="151">LLM 粗筛</text>
        <text x="50" y="185">抓取 JD</text>
        <text x="50" y="219">匹配打分</text>

        <rect className="pf-dg-box pf-dg-box--core" x="210" y="130" width="110" height="60" />
        <text className="pf-dg-title" x="265" y="155" textAnchor="middle">
          AES-256-GCM
        </text>
        <text x="265" y="173" textAnchor="middle">
          密文
        </text>

        <rect className="pf-dg-box" x="360" y="120" width="105" height="70" />
        <text className="pf-dg-title" x="412" y="146" textAnchor="middle">
          Pages
        </text>
        <text x="412" y="164" textAnchor="middle">
          静态站
        </text>

        <rect className="pf-dg-box" x="360" y="240" width="105" height="60" />
        <text className="pf-dg-title" x="412" y="265" textAnchor="middle">
          浏览器
        </text>
        <text x="412" y="283" textAnchor="middle">
          本地解密
        </text>

        <g className="pf-dg-notes">
          <text className="pf-dg-note" x="188" y="152" textAnchor="middle">
            每日
          </text>
          <text className="pf-dg-note" x="340" y="178" textAnchor="middle">
            commit
          </text>
          <text className="pf-dg-note" x="420" y="220">
            访问
          </text>
          <text className="pf-dg-note" x="330" y="236" textAnchor="end">
            密码不上传
          </text>
        </g>

        <text className="pf-dg-note" x="16" y="300">
          0 台服务器 · 每天 09:17
        </text>
      </svg>
    ),
  },

  "dosh-global": {
    label: "DO&SH 海外站系统结构图",
    caption:
      "Next.js 官网承载双品牌内容与询盘，REST API 连接后台控制台；商品、内容、线索和权限在同一个后台里管理。",
    art: (
      <svg
        className="pf-dg"
        viewBox="0 0 480 340"
        role="img"
        aria-label="DO&SH 官网通过 REST API 连接后台，统一管理双品牌商品、内容、线索和权限"
      >
        <defs>
          <ArrowHead id="pf-dg-dosh-arrow" />
        </defs>

        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M151 125 H205"
          markerEnd="url(#pf-dg-dosh-arrow)"
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M300 145 H344"
          markerEnd="url(#pf-dg-dosh-arrow)"
          style={{ transitionDelay: "180ms" }}
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M166 270 C192 252 212 215 232 190"
          markerEnd="url(#pf-dg-dosh-arrow)"
          style={{ transitionDelay: "360ms" }}
        />

        <rect className="pf-dg-box" x="16" y="70" width="135" height="110" />
        <text className="pf-dg-title" x="83" y="98" textAnchor="middle">
          DO&amp;SH 官网
        </text>
        <text x="83" y="118" textAnchor="middle">
          Next.js
        </text>
        <text x="83" y="138" textAnchor="middle">
          Monarch / Oceano
        </text>
        <text x="83" y="158" textAnchor="middle">
          商品 · 案例 · 新闻
        </text>

        <rect className="pf-dg-box pf-dg-box--core" x="205" y="115" width="95" height="60" />
        <text className="pf-dg-title" x="252" y="140" textAnchor="middle">
          REST API
        </text>
        <text x="252" y="158" textAnchor="middle">
          JWT
        </text>

        <rect className="pf-dg-box" x="344" y="40" width="120" height="170" />
        <text className="pf-dg-title" x="404" y="66" textAnchor="middle">
          后台控制台
        </text>
        <text x="404" y="94" textAnchor="middle">
          商品 · 内容
        </text>
        <text x="404" y="116" textAnchor="middle">
          新闻 · 地区
        </text>
        <text x="404" y="138" textAnchor="middle">
          CMS 页面
        </text>
        <text x="404" y="160" textAnchor="middle">
          权限 · 日志
        </text>
        <text x="404" y="182" textAnchor="middle">
          线索池
        </text>

        <rect className="pf-dg-box" x="16" y="245" width="150" height="55" />
        <text className="pf-dg-title" x="91" y="268" textAnchor="middle">
          线索入口
        </text>
        <text x="91" y="286" textAnchor="middle">
          表单 · 询盘 · Email
        </text>

        <g className="pf-dg-notes">
          <text className="pf-dg-note" x="178" y="116" textAnchor="middle">
            页面
          </text>
          <text className="pf-dg-note" x="322" y="136" textAnchor="middle">
            管理
          </text>
          <text className="pf-dg-note" x="208" y="246" textAnchor="middle">
            线索
          </text>
        </g>
      </svg>
    ),
  },

  cpi: {
    label: "算力换股调研系统流程图",
    caption:
      "项目资料进入 AI 调研：联网检索、抓取正文、证据分类、主张复核；证据链支撑可研报告与入库/暂缓/不投资评估。",
    art: (
      <svg
        className="pf-dg"
        viewBox="0 0 480 340"
        role="img"
        aria-label="算力换股调研系统从项目资料到 AI 调研、证据链、可研报告和项目评估的流程"
      >
        <defs>
          <ArrowHead id="pf-dg-cpi-arrow" />
        </defs>

        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M116 160 H150"
          markerEnd="url(#pf-dg-cpi-arrow)"
        />
        <path
          className="pf-dg-flow pf-dg-signal"
          pathLength="1"
          d="M270 145 C285 130 285 115 300 105"
          markerEnd="url(#pf-dg-cpi-arrow)"
          style={{ transitionDelay: "180ms" }}
        />
        <path
          className="pf-dg-flow"
          pathLength="1"
          d="M375 155 V230"
          markerEnd="url(#pf-dg-cpi-arrow)"
          style={{ transitionDelay: "360ms" }}
        />
        <path
          className="pf-dg-dash"
          d="M300 95 C276 72 252 84 240 112"
          markerEnd="url(#pf-dg-cpi-arrow)"
        />

        <rect className="pf-dg-box" x="16" y="120" width="100" height="80" />
        <text className="pf-dg-title" x="66" y="148" textAnchor="middle">
          项目资料
        </text>
        <text x="66" y="166" textAnchor="middle">
          公司 / 行业
        </text>
        <text x="66" y="184" textAnchor="middle">
          资料
        </text>

        <rect className="pf-dg-box pf-dg-box--core" x="150" y="120" width="120" height="80" />
        <text className="pf-dg-title" x="210" y="146" textAnchor="middle">
          AI 调研
        </text>
        <text x="210" y="164" textAnchor="middle">
          联网检索
        </text>
        <text x="210" y="182" textAnchor="middle">
          抓取 · 分类
        </text>

        <rect className="pf-dg-box" x="300" y="60" width="150" height="95" />
        <text className="pf-dg-title" x="375" y="86" textAnchor="middle">
          证据链
        </text>
        <text x="375" y="106" textAnchor="middle">
          主张 + 来源
        </text>
        <text x="375" y="126" textAnchor="middle">
          复核 / 补搜
        </text>
        <text x="375" y="146" textAnchor="middle">
          对话追问
        </text>

        <rect className="pf-dg-box" x="300" y="230" width="150" height="70" />
        <text className="pf-dg-title" x="375" y="256" textAnchor="middle">
          可研报告
        </text>
        <text x="375" y="276" textAnchor="middle">
          暂缓 / 入库
        </text>
        <text x="375" y="294" textAnchor="middle">
          不投资
        </text>

        <g className="pf-dg-notes">
          <text className="pf-dg-note" x="133" y="152" textAnchor="middle">
            启动
          </text>
          <text className="pf-dg-note" x="292" y="118" textAnchor="end">
            提取
          </text>
          <text className="pf-dg-note" x="384" y="205" textAnchor="middle">
            生成
          </text>
          <text className="pf-dg-note" x="252" y="78" textAnchor="middle">
            补搜
          </text>
        </g>

        <text className="pf-dg-note" x="150" y="320">
          每一步保留来源与证据
        </text>
      </svg>
    ),
  },
};

export function ProjectDiagram({
  slug,
  caption = true,
  className,
}: {
  slug: string;
  caption?: boolean;
  className?: string;
}) {
  const diagram = DIAGRAMS[slug];
  const { ref, inView } = useInView<HTMLElement>();

  if (!diagram) return null;

  return (
    <figure
      ref={ref}
      className={clsx("pf-diagram", inView && "is-inview", className)}
      aria-label={diagram.label}
    >
      <div className="pf-diagram-canvas">{diagram.art}</div>
      {caption && <figcaption>{diagram.caption}</figcaption>}
    </figure>
  );
}
