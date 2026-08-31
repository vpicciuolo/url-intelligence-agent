export type EvidenceField<T> = {
  value: T;
  confidence: number;
  method: string;
  sources: string[];
};

export type PageSignal = {
  url: string;
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLdTypes: string[];
  headings: string[];
  socials: string[];
  emails: string[];
  links: string[];
  textSample: string;
  status: number;
};

export type IntelligenceResult = {
  meta: Record<string, unknown>;
  inputUrl: string;
  finalUrl: string;
  profile: string;
  entity: {
    type: EvidenceField<string>;
    name: EvidenceField<string>;
    description?: EvidenceField<string>;
  };
  seo: {
    score: number;
    issues: string[];
  };
  socials: string[];
  contacts: { emails: string[] };
  importantPages: Record<string, string>;
  pages: PageSignal[];
  contradictions: string[];
  fingerprint: string;
  observedAt: string;
};
