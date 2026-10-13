/* AMG Hydrovac — emails the visitor their personalized rate sheet (PDF attached) right after the
   contact form succeeds, and copies the owner. The PDF is rebuilt here from the form answers with
   the same code the browser uses (assets/js/quote.js), so nothing uploaded by the visitor is ever
   forwarded. Sends through Resend (RESEND_API_KEY in Netlify environment variables). */
"use strict";

const { QUOTE_SRC, ANTON_B64 } = require("./lib/embedded.js");
const PDFLib = require("./lib/pdf-lib.min.js");
const fontkitModule = require("./lib/fontkit.umd.min.js");
const fontkit = fontkitModule && fontkitModule.default ? fontkitModule.default : fontkitModule;

const FROM = process.env.RATESHEET_FROM || "AMG Hydrovac <quotes@amghydrovac.ca>";
const OWNER = process.env.RATESHEET_OWNER || "tamim@amghydrovac.ca";
const REPLY_TO = process.env.RATESHEET_REPLY_TO || "quotes@amghydrovac.ca";
const ALLOWED_ORIGINS = ["https://amghydrovac.ca", "https://www.amghydrovac.ca", "http://localhost:8099"];
const FIELDS = { name: 120, company: 120, phone: 40, email: 160, service: 80, region: 80, customer_type: 20, timeline: 60, address: 200, details: 1500 };

/* ---------- the site's own rate-sheet code, run once per container ---------- */
let AMGQuote = null;
function loadQuote() {
  if (AMGQuote) return AMGQuote;
  const fontBytes = Buffer.from(ANTON_B64, "base64");
  const win = { PDFLib: PDFLib, fontkit: fontkit };
  const doc = { querySelector: () => null, getElementById: () => null, createElement: () => ({}), head: { appendChild() {} }, body: { appendChild() {} } };
  const fetchShim = () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength)) });
  const run = new Function("window", "document", "fetch", "Blob", "URL", "navigator", QUOTE_SRC);
  run(win, doc, fetchShim, function Blob() {}, { createObjectURL() { return ""; }, revokeObjectURL() {} }, {});
  AMGQuote = win.AMGQuote;
  return AMGQuote;
}

/* ---------- helpers ---------- */
const money = (n) => "$" + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const json = (status, body) => ({ statusCode: status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(body) });

const hits = new Map(); // best-effort per-IP throttle (per warm container)
function throttled(ip) {
  const now = Date.now(), windowMs = 15 * 60 * 1000, max = 6;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > max;
}

function cleanFields(body) {
  const out = {};
  for (const k of Object.keys(FIELDS)) {
    let v = body[k];
    v = (v === undefined || v === null) ? "" : String(v);
    out[k] = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, FIELDS[k]);
  }
  return out;
}

function bookMsg(e) {
  return "Hi AMG Hydrovac, I would like to book. Rate sheet " + e.id + ". Name: " + (e.name || "") + (e.company ? " (" + e.company + ")" : "") + ". Service: " + e.service + (e.address ? ". Site: " + e.address : "") + ". When: ___";
}

function emailHtml(e) {
  const first = (e.name || "").split(/\s+/)[0] || "there";
  const rows = e.minimum.map((l) => '<tr><td style="padding:8px 0;border-bottom:1px solid #e6e6e6;color:#1a1a1a;">' + esc(l.item) + '<div style="color:#6b7280;font-size:13px;">' + esc(l.detail) + "</div></td><td style=\"padding:8px 0 8px 12px;border-bottom:1px solid #e6e6e6;text-align:right;white-space:nowrap;color:#1a1a1a;\">" + money(l.amount) + "</td></tr>").join("");
  const msg = encodeURIComponent(bookMsg(e));
  const btn = (href, label) => '<a href="' + href + '" style="display:inline-block;margin:0 8px 8px 0;padding:11px 16px;border:1px solid #d9d9d9;border-radius:8px;color:#1a1a1a;text-decoration:none;font-weight:700;font-size:14px;">' + label + "</a>";
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f5f7;"><tr><td align="center" style="padding:24px 12px;">' +
    '<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;">' +
    '<tr><td style="background:#0E1116;padding:20px 28px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr>' +
    '<td style="padding-right:14px;"><img src="https://amghydrovac.ca/apple-touch-icon.png" width="44" height="44" alt="AMG Hydrovac" style="display:block;border-radius:8px;"></td>' +
    '<td style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">AMG HYDROVAC<div style="color:#F5A623;font-size:11px;letter-spacing:2px;font-weight:600;">HYDRO EXCAVATION · TORONTO &amp; THE GTA</div></td></tr></table></td></tr>' +
    '<tr><td style="padding:28px 28px 8px;">' +
    '<p style="margin:0 0 14px;font-size:16px;line-height:1.5;">Hi ' + esc(first) + ",</p>" +
    '<p style="margin:0 0 14px;font-size:16px;line-height:1.5;">Thanks for reaching out. Your personalized rate sheet is attached as a PDF. It is the same sheet you saw on our site, so you can forward it or keep it on file.</p>' +
    '<p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;color:#b45309;font-weight:700;">YOUR MINIMUM DISPATCH · RATE SHEET ' + esc(e.id) + "</p>" +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:15px;">' + rows +
    '<tr><td style="padding:10px 0 2px;color:#6b7280;">Subtotal</td><td style="padding:10px 0 2px 12px;text-align:right;color:#6b7280;">' + money(e.subtotal) + "</td></tr>" +
    '<tr><td style="padding:2px 0;color:#6b7280;">HST (13%)</td><td style="padding:2px 0 2px 12px;text-align:right;color:#6b7280;">' + money(e.hst) + "</td></tr>" +
    '<tr><td style="padding:10px 0;font-weight:700;font-size:17px;">Minimum dispatch total</td><td style="padding:10px 0 10px 12px;text-align:right;font-weight:700;font-size:17px;white-space:nowrap;">' + money(e.total) + "</td></tr></table>" +
    '<p style="margin:12px 0 0;font-size:14px;line-height:1.5;color:#4b5563;">Everything else on the sheet is charged only if the job needs it, at the rates shown. Rates are valid for 30 days. Service: ' + esc(e.service) + " · " + esc(e.typeLabel) + (e.timeline ? " · Timing: " + esc(e.timeline) : "") + ".</p>" +
    "</td></tr>" +
    '<tr><td style="padding:18px 28px 6px;"><p style="margin:0 0 10px;font-size:16px;font-weight:700;">Ready to book?</p>' +
    '<p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Send the site address, what we are digging or cleaning, and the date you need. We confirm the scope, locates and date the same business day.</p>' +
    btn("tel:+18884824504", "Call 1-888-482-4504") + btn("https://wa.me/14373311609?text=" + msg, "WhatsApp") + btn("sms:+14373311609?&body=" + msg, "Text 437-331-1609") + btn("mailto:quotes@amghydrovac.ca?subject=" + encodeURIComponent("Booking - rate sheet " + e.id), "Email") +
    "</td></tr>" +
    '<tr><td style="padding:18px 28px 26px;border-top:1px solid #eeeeee;">' +
    '<p style="margin:0;font-size:15px;line-height:1.6;">Tamim Amem<br><span style="color:#6b7280;">Owner, AMG Hydrovac</span><br><a href="https://amghydrovac.ca" style="color:#b45309;text-decoration:none;">amghydrovac.ca</a> · 24/7 dispatch <a href="tel:+18884824504" style="color:#1a1a1a;text-decoration:none;">1-888-482-4504</a></p>' +
    '<p style="margin:14px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;">13575993 Canada Inc. o/a AMG Hydrovac · $5M general liability · WSIB registered. Just reply to this email if anything on the sheet needs a second look.</p>' +
    "</td></tr></table></td></tr></table></body></html>";
}

function emailText(e) {
  const first = (e.name || "").split(/\s+/)[0] || "there";
  const lines = e.minimum.map((l) => "  " + l.item + ": " + money(l.amount));
  return "Hi " + first + ",\n\nThanks for reaching out. Your personalized rate sheet is attached as a PDF — the same sheet you saw on our site.\n\n" +
    "YOUR MINIMUM DISPATCH · RATE SHEET " + e.id + "\n" + lines.join("\n") + "\n  Subtotal: " + money(e.subtotal) + "\n  HST (13%): " + money(e.hst) + "\n  Minimum dispatch total: " + money(e.total) + "\n\n" +
    "Everything else on the sheet is charged only if the job needs it. Rates are valid for 30 days.\n\n" +
    "Ready to book? Send the site address, what we are digging or cleaning, and the date you need.\nCall 1-888-482-4504 (24/7) · Text or WhatsApp 437-331-1609 · or reply to this email.\n\n" +
    "Tamim Amem\nOwner, AMG Hydrovac\namghydrovac.ca\n\n13575993 Canada Inc. o/a AMG Hydrovac · $5M general liability · WSIB registered\n";
}

/* ---------- handler ---------- */
exports.handler = async function (event) {
  if (event.httpMethod !== "POST") return json(405, { ok: false, error: "method" });
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || "";
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return json(403, { ok: false, error: "origin" });
  if (!process.env.RESEND_API_KEY) return json(503, { ok: false, error: "not configured" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch (e) { return json(400, { ok: false, error: "json" }); }
  if (body.botcheck) return json(200, { ok: true, skipped: "bot" });
  const f = cleanFields(body);
  if (!f.name || !f.email || !f.service) return json(400, { ok: false, error: "missing fields" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email) || /[,;]/.test(f.email)) return json(400, { ok: false, error: "email" });
  if (!["business", "municipal", "residential"].includes(f.customer_type)) f.customer_type = "business";

  const ip = (event.headers && (event.headers["x-nf-client-connection-ip"] || event.headers["client-ip"])) || "unknown";
  if (throttled(ip)) return json(429, { ok: false, error: "slow down" });

  let bytes, e;
  try {
    const Q = loadQuote();
    const form = { querySelector: (sel) => { const m = sel.match(/name="([^"]+)"/); return m && f[m[1]] !== undefined ? { value: f[m[1]] } : null; } };
    e = Q.compute(form);
    // keep the visitor's own sheet number and date so the email matches what they saw on screen
    if (typeof body.sheet_id === "string" && /^AMG-\d{8}-\d{4}$/.test(body.sheet_id)) e.id = body.sheet_id;
    if (typeof body.sheet_date === "string" && /^[A-Za-z]{3,9} \d{1,2}, \d{4}$/.test(body.sheet_date)) e.date = body.sheet_date;
    bytes = await Q.pdf(e);
  } catch (err) {
    console.error("pdf build failed", err && err.message);
    return json(500, { ok: false, error: "pdf" });
  }

  const payload = {
    from: FROM,
    to: [f.email],
    bcc: [OWNER],
    reply_to: REPLY_TO,
    subject: "Your AMG Hydrovac rate sheet · " + e.id,
    html: emailHtml(e),
    text: emailText(e),
    attachments: [{ filename: "AMG-Hydrovac-Rate-Sheet-" + e.id + ".pdf", content: Buffer.from(bytes).toString("base64") }],
    headers: { "X-Entity-Ref-ID": e.id },
  };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: "Bearer " + process.env.RESEND_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) { console.error("resend error", res.status, (await res.text()).slice(0, 300)); return json(502, { ok: false, error: "send" }); }
    const data = await res.json();
    return json(200, { ok: true, id: data && data.id, sheet: e.id });
  } catch (err) {
    console.error("resend request failed", err && err.message);
    return json(502, { ok: false, error: "send" });
  }
};
