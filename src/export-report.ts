import PDFDocument from "pdfkit";

export const EXPORT_BRAND = {
  name: "URL Intelligence Agent",
  creator: "Vincenzo Picciuolo",
  company: "HRN Innovation Technologies Ltd",
  github: "https://github.com/vpicciuolo/url-intelligence-agent",
  huggingFace: "https://huggingface.co/spaces/vpicciuolo/url-intelligence-agent",
  tagline: "URL in. Identity, evidence and intelligence out."
} as const;

export type ExportReport = {
  id: string;
  userSub: string;
  username: string;
  url: string;
  action: string;
  createdAt: string;
  result: unknown;
};

const safeJson = (value: unknown): string => {
  try { return JSON.stringify(value, null, 2); } catch { return String(value); }
};

const actionTitle = (action: string): string => action === "investigate_url"
  ? "Full URL Investigation"
  : action.replace(/^audit_/, "").replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase());

export function exportAttribution(): Record<string, string> {
  return { ...EXPORT_BRAND };
}

function watermark(doc: any, page: number, count: number): void {
  const w = doc.page.width;
  const h = doc.page.height;
  const line = `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`;
  doc.save();
  doc.fillColor("#334155").fillOpacity(0.055).font("Helvetica-Bold").fontSize(11);
  doc.rotate(-28, { origin: [w / 2, h / 2] });
  doc.text(line, 55, h / 2 - 12, { width: w - 110, align: "center" });
  doc.restore();
  doc.save();
  doc.fillOpacity(1).strokeColor("#CBD5E1").lineWidth(0.5).moveTo(42, h - 44).lineTo(w - 42, h - 44).stroke();
  doc.fillColor("#64748B").font("Helvetica").fontSize(6.2).text(line, 42, h - 37, { width: w - 84, align: "center" });
  doc.text(`Page ${page} / ${count}`, 42, h - 23, { width: w - 84, align: "center" });
  doc.restore();
}

export async function generatePdf(report: ExportReport): Promise<Buffer> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    bufferPages: true,
    info: {
      Title: `${EXPORT_BRAND.name} — ${report.url}`,
      Author: EXPORT_BRAND.creator,
      Subject: `${actionTitle(report.action)} report`,
      Keywords: "URL intelligence, web intelligence, AI agent, MCP, SEO, security, trust, entity resolution",
      Creator: `${EXPORT_BRAND.name} by ${EXPORT_BRAND.creator}`,
      Producer: `${EXPORT_BRAND.name} Hugging Face Space`
    }
  });
  const chunks: Buffer[] = [];
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  doc.rect(0, 0, doc.page.width, 118).fill("#07101C");
  doc.fillColor("#22D3EE").font("Helvetica-Bold").fontSize(10).text("OPEN SOURCE · URL INTELLIGENCE", 48, 35);
  doc.fillColor("#FFFFFF").fontSize(25).text(EXPORT_BRAND.name, 48, 53);
  doc.fillColor("#CBD5E1").font("Helvetica").fontSize(9).text(EXPORT_BRAND.tagline, 48, 87);

  doc.fillColor("#0F172A").font("Helvetica-Bold").fontSize(18).text(actionTitle(report.action), 48, 145);
  doc.font("Helvetica").fontSize(9).fillColor("#334155").text(report.url, 48, 173, { width: doc.page.width - 96 });
  doc.moveDown(1.2);
  doc.font("Helvetica-Bold").text("Generated: ", { continued: true }).font("Helvetica").text(new Date(report.createdAt).toUTCString());
  doc.font("Helvetica-Bold").text("Hugging Face user: ", { continued: true }).font("Helvetica").text(`@${report.username}`);
  doc.font("Helvetica-Bold").text("Report ID: ", { continued: true }).font("Helvetica").text(report.id);

  doc.moveDown(1.1);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0F172A").text("Project attribution");
  doc.font("Helvetica").fontSize(9).fillColor("#334155").text(`Creator: ${EXPORT_BRAND.creator}`);
  doc.text(`Company: ${EXPORT_BRAND.company}`);
  doc.fillColor("#2563EB").text(EXPORT_BRAND.github, { link: EXPORT_BRAND.github, underline: true });
  doc.text(EXPORT_BRAND.huggingFace, { link: EXPORT_BRAND.huggingFace, underline: true });

  doc.moveDown(1.1);
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#0F172A").text("Complete analysis result");
  doc.moveDown(0.4);
  doc.font("Courier").fontSize(7).fillColor("#1E293B").text(safeJson(report.result), {
    lineGap: 0.8,
    width: doc.page.width - 96
  });

  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    watermark(doc, i - range.start + 1, range.count);
  }
  doc.end();
  return finished;
}

export function generateJson(report: ExportReport): string {
  return JSON.stringify({
    report: { id: report.id, url: report.url, action: report.action, analysis: actionTitle(report.action), generatedAt: report.createdAt, generatedFor: `@${report.username}` },
    attribution: exportAttribution(),
    watermark: `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`,
    result: report.result
  }, null, 2);
}

export function generateMarkdown(report: ExportReport): string {
  const mark = `${EXPORT_BRAND.name} | GitHub: ${EXPORT_BRAND.github} | Hugging Face: ${EXPORT_BRAND.huggingFace} | Creator: ${EXPORT_BRAND.creator}`;
  return `# ${EXPORT_BRAND.name}\n\n**${EXPORT_BRAND.tagline}**\n\n> ${mark}\n\n## Report\n\n- Target: ${report.url}\n- Analysis: ${actionTitle(report.action)}\n- Generated: ${report.createdAt}\n- Hugging Face user: @${report.username}\n- Report ID: ${report.id}\n\n## Attribution\n\n- Creator: ${EXPORT_BRAND.creator}\n- Company: ${EXPORT_BRAND.company}\n- GitHub: ${EXPORT_BRAND.github}\n- Hugging Face: ${EXPORT_BRAND.huggingFace}\n\n## Complete analysis result\n\n\`\`\`json\n${safeJson(report.result)}\n\`\`\`\n\n---\n${mark}\n`;
}

export function generateHtml(report: ExportReport): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  const mark = `${EXPORT_BRAND.name} • ${EXPORT_BRAND.github} • ${EXPORT_BRAND.huggingFace} • Creator: ${EXPORT_BRAND.creator}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(EXPORT_BRAND.name)} Report</title><style>body{font-family:Inter,Arial,sans-serif;margin:0;background:#07101c;color:#eaf2ff}.wrap{max-width:1000px;margin:auto;padding:40px 40px 72px}.card{background:#0c1828;border:1px solid #263a57;border-radius:14px;padding:20px;margin:18px 0}pre{white-space:pre-wrap;word-break:break-word;background:#040912;padding:18px;border-radius:10px}.wm{position:fixed;bottom:0;left:0;right:0;background:#040912;color:#8da1bb;font-size:10px;padding:9px;text-align:center;border-top:1px solid #263a57}a{color:#22d3ee}@media print{body{background:#fff;color:#111}.card{background:#fff;border-color:#ccc}pre{background:#f5f5f5;color:#111}.wm{background:#fff;color:#777}}</style></head><body><main class="wrap"><h1>${esc(EXPORT_BRAND.name)}</h1><p>${esc(EXPORT_BRAND.tagline)}</p><section class="card"><h2>${esc(actionTitle(report.action))}</h2><p><b>Target:</b> ${esc(report.url)}</p><p><b>Generated:</b> ${esc(report.createdAt)}</p><p><b>User:</b> @${esc(report.username)}</p><p><b>Report ID:</b> ${esc(report.id)}</p></section><section class="card"><h2>Attribution</h2><p>Creator: ${esc(EXPORT_BRAND.creator)}</p><p>Company: ${esc(EXPORT_BRAND.company)}</p><p><a href="${EXPORT_BRAND.github}">${EXPORT_BRAND.github}</a></p><p><a href="${EXPORT_BRAND.huggingFace}">${EXPORT_BRAND.huggingFace}</a></p></section><section class="card"><h2>Complete result</h2><pre>${esc(safeJson(report.result))}</pre></section></main><div class="wm">${esc(mark)}</div></body></html>`;
}

export function exportFilename(report: ExportReport, ext: string): string {
  let host = "url";
  try { host = new URL(report.url).hostname.replace(/[^a-z0-9.-]+/gi, "-"); } catch { /* noop */ }
  return `url-intelligence-${host}-${report.id.slice(0, 8)}.${ext}`;
}
