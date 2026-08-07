export type WikiDomainKey = "trust" | "learning" | "thinking" | "living";

export interface WikiDomain {
  key: WikiDomainKey;
  index: string;
  label: string;
  eyebrow: string;
  description: string;
}

export const WIKI_DOMAINS: readonly WikiDomain[] = [
  {
    key: "trust",
    index: "01",
    label: "技术与信任",
    eyebrow: "Trust Systems",
    description: "从密码学对象到信任链，理解数字世界怎样回答“凭什么相信”。",
  },
  {
    key: "learning",
    index: "02",
    label: "学习与行动",
    eyebrow: "Learning Systems",
    description: "把输入加工成可以调用的能力，并让行动形成稳定反馈。",
  },
  {
    key: "thinking",
    index: "03",
    label: "思考与觉察",
    eyebrow: "Mental Models",
    description: "过滤信息、理解时间，并把注意力带回真实处境。",
  },
  {
    key: "living",
    index: "04",
    label: "创造与生活",
    eyebrow: "Creative Life",
    description: "在表达、情绪与长期积累之间，寻找可持续的生活方式。",
  },
] as const;

const DOMAIN_RULES: Record<WikiDomainKey, readonly string[]> = {
  trust: [
    "PKI",
    "证书",
    "信任链",
    "数字签名",
    "ASN.1",
    "DER",
    "CRL",
    "OCSP",
    "颁发机构",
    "注册机构",
  ],
  learning: ["主动提取", "技能自动化", "深度工作", "知行合一", "反馈回路"],
  thinking: ["独立思考", "信息过滤", "正念", "当下", "时间感知"],
  living: ["专有知识", "杠杆", "恐惧", "情绪调节", "书写疗愈"],
};

export function getWikiDomain(title: string): WikiDomain {
  const match = WIKI_DOMAINS.find(domain =>
    DOMAIN_RULES[domain.key].some(keyword => title.includes(keyword))
  );
  return match ?? WIKI_DOMAINS[3];
}
