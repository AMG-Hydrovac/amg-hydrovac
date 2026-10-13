/* =================================================================
   AMG HYDROVAC — personalized rate sheet + PDF (contact.html)
   Vanilla JS, no build step. pdf-lib + fontkit are fetched from a CDN
   only when the visitor asks for the PDF. Rates: owner, 2026-10-12.
   The sheet never assumes hours or loads: it shows the minimum dispatch
   (4-hour minimum + 2 hours travel + 1 load) as the total, and lists
   everything else as "additional, only if required".
   ================================================================= */
(function () {
  "use strict";

  var RATES = {
    business:    { label: "Contractor, plumber or business", hourly: 250, perBox: 250, emergency: 325 },
    municipal:   { label: "Municipality or utility",        hourly: 250, perBox: 250, emergency: 325 },
    residential: { label: "Homeowner",              hourly: 270, perBox: 270, emergency: 375, hoseLabourer: 350 }
  };
  var MIN_HOURS = 4, TRAVEL_HOURS = 2, BOX_MIN = 4;
  var DISPOSAL_PER_LOAD = 450;                               // hauled to AMG's yard; at cost elsewhere
  var HOSE = [["up to 100 ft", 500], ["up to 200 ft", 750], ["up to 300 ft (maximum)", 1000]];
  var FLUSH = 150;
  var CONTAMINATED_PER_TONNE = 200;                        // per tonne, replaces the per-load charge for that load (owner 2026-10-12)
  var HST = 0.13;
  var DAYS_VALID = 30;

  function money(n) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? String(el.value || "").trim() : ""; }
  function sheetId() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "AMG-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  }

  /* ---------- the sheet ---------- */
  function compute(form) {
    var typeKey = val(form, "customer_type") || "business";
    var r = RATES[typeKey] || RATES.business;
    var service = val(form, "service");
    var isBoxJob = /water box/i.test(service);
    var minimum = [], additional = [], notes = [];

    if (isBoxJob) {
      minimum.push({ item: "Water box / curb stop work, " + BOX_MIN + "-box minimum", detail: BOX_MIN + " boxes x " + money(r.perBox) + " per box", amount: BOX_MIN * r.perBox });
      additional.push({ item: "Each additional water box", detail: "beyond the " + BOX_MIN + "-box minimum", amount: money(r.perBox) });
    } else {
      minimum.push({ item: "Hydrovac and operator, " + MIN_HOURS + "-hour minimum", detail: MIN_HOURS + " hours x " + money(r.hourly) + " per hour", amount: MIN_HOURS * r.hourly });
      additional.push({ item: "Each additional hour on site", detail: "billed to the half hour after the minimum", amount: money(r.hourly) });
    }
    minimum.push({ item: "Travel (mobilization and demobilization)", detail: TRAVEL_HOURS + " hours x " + money(r.hourly) + " per hour, flat per dispatch", amount: TRAVEL_HOURS * r.hourly });
    minimum.push({ item: "Spoil disposal, 1 load", detail: "hauled away and disposed of by AMG; disposal at a site you specify is billed at cost", amount: DISPOSAL_PER_LOAD });

    additional.push({ item: "Each additional load of spoil", detail: "hauled away and disposed of by AMG; at cost at a site you specify", amount: money(DISPOSAL_PER_LOAD) });
    additional.push({ item: "Contaminated spoil disposal", detail: "if the receiving facility classifies the material as contaminated, that load is billed by scale weight instead of the " + money(DISPOSAL_PER_LOAD) + " load charge; we tell you before it leaves the site", amount: money(CONTAMINATED_PER_TONNE) + "/tonne" });
    additional.push({ item: "Remote hose, flat, when the truck cannot park beside the dig", detail: HOSE.map(function (h) { return h[0] + " " + money(h[1]); }).join("  ·  "), amount: "from " + money(HOSE[0][1]) });
    if (r.hoseLabourer) additional.push({ item: "Extra labourer when remote hose is used", detail: "flat per dispatch, in addition to the remote hose charge", amount: money(r.hoseLabourer) });
    additional.push({ item: "Flushing", detail: "", amount: money(FLUSH) });
    additional.push({ item: "After-hours dispatch: nights, weekends and holidays", detail: "replaces the standard hourly rate only when we roll outside business hours; urgent daytime work is at the standard rates above", amount: money(r.emergency) + "/hour" });

    var subtotal = 0;
    minimum.forEach(function (l) { subtotal += l.amount; });
    var hst = Math.round(subtotal * HST * 100) / 100;

    notes.push("This minimum is charged on every dispatch and does not shrink if the work takes less time. Your invoice is this minimum plus only the additional items actually used, at the rates above.");
    notes.push("Anything not on this sheet (traffic control, private locates, permits, surface restoration) is agreed with you before we book.");
    notes.push("Valid Ontario One Call locates are required before excavation; we confirm them and can arrange private locates.");
    notes.push("Rates valid for " + DAYS_VALID + " days from the date above. Canadian dollars; HST shown separately.");

    return {
      id: sheetId(), date: new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }), typeLabel: r.label, service: service || "Hydrovac services",
      minimum: minimum, additional: additional, notes: notes,
      subtotal: subtotal, hst: hst, total: subtotal + hst,
      timeline: val(form, "timeline"), address: val(form, "address"), region: val(form, "region"),
      details: val(form, "details"),
      name: val(form, "name"), company: val(form, "company"), email: val(form, "email"), phone: val(form, "phone")
    };
  }

  function summaryText(e) {
    var out = ["Rate sheet " + e.id + " (" + e.typeLabel + ") - " + e.service + (e.timeline ? " - timing: " + e.timeline : "")];
    e.minimum.forEach(function (l) { out.push(l.item + ": " + money(l.amount)); });
    out.push("Minimum dispatch: " + money(e.subtotal) + " + HST " + money(e.hst) + " = " + money(e.total));
    return out.join("\n");
  }

  function bookMsg(e) {
    return "Hi AMG Hydrovac, I would like to book. Rate sheet " + e.id + ". Name: " + (e.name || "") + (e.company ? " (" + e.company + ")" : "") + ". Service: " + e.service + (e.address ? ". Site: " + e.address : "") + ". When: ___";
  }

  var ICON = {"phone":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z\"/></svg>","sms":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/><path d=\"M8 9h8M8 13h5\"/></svg>","wa":"<svg viewBox=\"0 0 24 24\" fill=\"currentColor\" aria-hidden=\"true\"><path d=\"M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-1 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.5-.6c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z\"/></svg>","mail":"<svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><rect x=\"2\" y=\"4\" width=\"20\" height=\"16\" rx=\"2\"/><path d=\"m2 7 10 6 10-6\"/></svg>"};
  function bookRow(e) {
    var msg = encodeURIComponent(bookMsg(e));
    return '<div class="book-row" aria-label="Book by phone, text, WhatsApp or email">' +
      '<a class="book-btn" href="tel:+18884824504">' + ICON.phone + '<span>Call</span></a>' +
      '<a class="book-btn" href="sms:+14373311609?&body=' + msg + '">' + ICON.sms + '<span>Text</span></a>' +
      '<a class="book-btn" href="https://wa.me/14373311609?text=' + msg + '" target="_blank" rel="noopener">' + ICON.wa + '<span>WhatsApp</span></a>' +
      '<a class="book-btn" href="mailto:quotes@amghydrovac.ca?subject=' + encodeURIComponent('Booking - rate sheet ' + e.id) + '&body=' + msg + '">' + ICON.mail + '<span>Email</span></a>' +
    '</div>';
  }

  /* ---------- on-screen panel ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render(e, mount) {
    var minRows = e.minimum.map(function (l) {
      return '<tr><td><strong>' + esc(l.item) + '</strong>' + (l.detail ? '<br><span>' + esc(l.detail) + '</span>' : '') + '</td><td class="estimate__amt"><span class="num">' + money(l.amount) + '</span></td></tr>';
    }).join("");
    var addRows = e.additional.map(function (l) {
      return '<tr><td><strong>' + esc(l.item) + '</strong>' + (l.detail ? '<br><span>' + esc(l.detail) + '</span>' : '') + '</td><td class="estimate__amt"><span class="num">' + esc(l.amount) + '</span></td></tr>';
    }).join("");
    mount.innerHTML =
      '<div class="estimate" id="estimate">' +
        '<div class="estimate__head"><span class="eyebrow">Your personalized rate sheet</span><h3>' + esc(e.service) + ' &middot; ' + esc(e.typeLabel) + '</h3>' +
        '<p class="estimate__id">Rate sheet ' + esc(e.id) + ' &middot; ' + esc(e.date) + ' &middot; valid ' + DAYS_VALID + ' days</p></div>' +
        '<p class="estimate__label">Minimum dispatch</p>' +
        '<table class="estimate__table"><tbody>' + minRows + '</tbody>' +
        '<tfoot><tr><td>Subtotal</td><td class="estimate__amt"><span class="num">' + money(e.subtotal) + '</span></td></tr>' +
        '<tr><td>HST (13%)</td><td class="estimate__amt"><span class="num">' + money(e.hst) + '</span></td></tr>' +
        '<tr class="estimate__total"><td>Minimum dispatch total</td><td class="estimate__amt"><span class="num">' + money(e.total) + '</span></td></tr></tfoot></table>' +
        '<p class="estimate__label">Additional, only if required &middot; CAD, plus 13% HST</p>' +
        '<table class="estimate__table estimate__table--add"><tbody>' + addRows + '</tbody></table>' +
        '<ul class="estimate__notes">' + e.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + '</ul>' +
        '<div class="estimate__actions">' +
          '<a class="btn" id="estimate-pdf" href="#" aria-disabled="true" role="button">Preparing your PDF\u2026</a>' +
        '</div>' +
        bookRow(e) +
        '<p class="form-note" id="estimate-status" aria-live="polite"></p>' +
        '<p class="form-note" id="estimate-email" aria-live="polite"></p>' +
      '</div>';
    var btn = mount.querySelector("#estimate-pdf"), status = mount.querySelector("#estimate-status");
    var name = "AMG-Hydrovac-Rate-Sheet-" + e.id + ".pdf";
    buildPdf(e).then(function (bytes) {
      var blob = new Blob([bytes], { type: "application/pdf" });
      if (mount.__pdfUrl) { try { URL.revokeObjectURL(mount.__pdfUrl); } catch (err) { /* ignore */ } }
      var url = URL.createObjectURL(blob);
      mount.__pdfUrl = url;
      btn.href = url; btn.download = name; btn.removeAttribute("aria-disabled");
      btn.textContent = "Download PDF";
      status.textContent = "Your PDF is ready. On an iPhone it opens first; use Share to save it.";
    }).catch(function () {
      btn.textContent = "PDF unavailable on this device";
      status.textContent = "Your rate sheet is above. Call, text, WhatsApp or email us and we send the PDF.";
    });
  }

  /* ---------- PDF (pdf-lib, lazy-loaded) ---------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = resolve; s.onerror = reject; document.head.appendChild(s);
    });
  }
  var libs;
  function ensureLibs() {
    if (!libs) libs = Promise.all([
      window.PDFLib ? Promise.resolve() : loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"),
      window.fontkit ? Promise.resolve() : loadScript("https://unpkg.com/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js"),
      fetch("assets/fonts/anton-regular.ttf").then(function (r) { if (!r.ok) throw new Error("font"); return r.arrayBuffer(); })
    ]).then(function (res) { return res[2]; }).catch(function (err) { libs = null; throw err; });
    return libs;
  }

  function buildPdf(e) {
    return ensureLibs().then(function (antonBytes) {
      var PDFLib = window.PDFLib, rgb = PDFLib.rgb;
      var AMBER = rgb(0.961, 0.651, 0.137), INK = rgb(0.055, 0.067, 0.086), DARK = rgb(0.067, 0.078, 0.047),
          BODY = rgb(0.24, 0.267, 0.302), GREY = rgb(0.42, 0.463, 0.51), LINE = rgb(0.86, 0.87, 0.89),
          TINT = rgb(0.996, 0.965, 0.906), ZEBRA = rgb(0.97, 0.975, 0.98), WHITE = rgb(1, 1, 1);
      return PDFLib.PDFDocument.create().then(function (doc) {
        doc.registerFontkit(window.fontkit);
        return Promise.all([doc.embedFont(antonBytes), doc.embedFont(PDFLib.StandardFonts.Helvetica), doc.embedFont(PDFLib.StandardFonts.HelveticaBold)]).then(function (fonts) {
          var anton = fonts[0], helv = fonts[1], bold = fonts[2];
          var W = 612, H = 792, M = 46, R = W - M;
          var page = doc.addPage([W, H]);
          function safe(t) { return String(t || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E\xA0-\xFF\u2013\u2014\u2018\u2019\u201C\u201D\u2022\u2026\u20AC]/g, ""); }
          e = Object.assign({}, e, { name: safe(e.name), company: safe(e.company), phone: safe(e.phone), email: safe(e.email), address: safe(e.address), region: safe(e.region), service: safe(e.service), timeline: safe(e.timeline), details: safe(e.details) });
          doc.setTitle("AMG Hydrovac rate sheet " + e.id);
          doc.setAuthor("AMG Hydrovac");

          function text(t, x, y, size, font, color, opts) { page.drawText(String(t), Object.assign({ x: x, y: y, size: size, font: font, color: color }, opts || {})); }
          function textRight(t, rx, y, size, font, color) { var w = font.widthOfTextAtSize(String(t), size); text(t, rx - w, y, size, font, color); }
          function wrap(t, font, size, width) {
            var words = String(t).split(/\s+/), lines = [], cur = "";
            words.forEach(function (w) {
              var test = cur ? cur + " " + w : w;
              if (font.widthOfTextAtSize(test, size) > width && cur) { lines.push(cur); cur = w; } else cur = test;
            });
            if (cur) lines.push(cur);
            return lines;
          }
          function para(t, x, y, size, font, color, width, gap) {
            var lines = wrap(t, font, size, width), lh = size * (gap || 1.35);
            lines.forEach(function (l, i) { text(l, x, y - i * lh, size, font, color); });
            return y - lines.length * lh;
          }
          function sectionHead(title, y) {
            text(title, M, y, 11, anton, DARK, { characterSpacing: 0.6 }); y -= 6;
            page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER });
            return y - 14;
          }
          function tableHead(y, left, right) {
            page.drawRectangle({ x: M, y: y - 4, width: R - M, height: 18, color: INK });
            text(left, M + 8, y + 1, 8, bold, WHITE, { characterSpacing: 0.8 });
            textRight(right, R - 8, y + 1, 8, bold, WHITE);
            return y - 20;
          }
          function tableRows(rows, y) {
            rows.forEach(function (l, i) {
              var detailLines = (l.detail ? wrap(l.detail, helv, 8.5, 380) : []);
              var rowH = 16 + detailLines.length * 10.5, rowTop = y + 10;
              if (i % 2 === 0) page.drawRectangle({ x: M, y: rowTop - rowH, width: R - M, height: rowH, color: ZEBRA });
              text(l.item, M + 8, y - 2, 10, bold, DARK);
              detailLines.forEach(function (d, k) { text(d, M + 8, y - 13 - k * 10, 8.3, helv, GREY); });
              textRight(typeof l.amount === "number" ? money(l.amount) : l.amount, R - 8, y - 2, 10.5, bold, DARK);
              y -= rowH;
              page.drawRectangle({ x: M, y: y + 9, width: R - M, height: 0.6, color: LINE });
            });
            return y;
          }

          // header band
          page.drawRectangle({ x: 0, y: H - 82, width: W, height: 82, color: INK });
          page.drawRectangle({ x: M, y: H - 70, width: 58, height: 58, color: AMBER });
          text("A", M + 18, H - 60, 38, anton, DARK);
          text("AMG HYDROVAC", M + 74, H - 44, 24, anton, WHITE);
          text("NON-DESTRUCTIVE HYDRO EXCAVATION", M + 74, H - 60, 7.5, bold, AMBER, { characterSpacing: 1.6 });
          textRight("PERSONALIZED RATE SHEET", R, H - 36, 15, anton, WHITE);
          textRight("1-888-482-4504  ·  quotes@amghydrovac.ca  ·  amghydrovac.ca", R, H - 56, 8.5, helv, rgb(0.9, 0.91, 0.92));

          var y = H - 112;
          text("PREPARED FOR", M, y, 11, anton, DARK, { characterSpacing: 0.6 });
          text("SHEET DETAILS", 330, y, 11, anton, DARK, { characterSpacing: 0.6 });
          y -= 6; page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 16;
          function oneLine(t, font, size, width) { var ls = wrap(t, font, size, width); return ls.length > 1 ? ls[0].replace(/\s+\S*$/, "") + "\u2026" : ls[0] || ""; }
          var left = [e.name, e.company, e.phone, e.email].filter(Boolean).map(function (t) { return oneLine(t, helv, 9.5, 270); });
          if (e.address) left.push(oneLine("Site: " + e.address + (e.region ? ", " + e.region : ""), helv, 9.5, 270));
          var right = ["Sheet no.: " + e.id, "Date: " + e.date, "Customer type: " + e.typeLabel, "Service: " + e.service];
          if (e.timeline) right.push("Timing: " + e.timeline);
          var ly = y, ry = y;
          left.forEach(function (l) { ly = para(l, M, ly, 9.5, helv, BODY, 270); });
          right.forEach(function (l) { ry = para(l, 330, ry, 9.5, helv, BODY, R - 330); });
          y = Math.min(ly, ry) - 8;
          // Everything below the details block has a fixed height; give the details only the room that is left.
          var rowsH = function (rows) { var h = 0; rows.forEach(function (l) { h += 16 + (l.detail ? wrap(l.detail, helv, 8.5, 380) : []).length * 10.5; }); return h; };
          var notesH = 0; e.notes.forEach(function (n) { notesH += wrap(n, helv, 8.6, R - M - 10).length * 8.6 * 1.3 + 2; });
          var fixedNeed = (30 + 20 + rowsH(e.minimum) + 2 + 14 + 14 + 32) + (30 + 20 + rowsH(e.additional) + 4) + (30 + notesH) + (30 + 14) + 40 + 10;
          if (e.details) {
            var lineH = 9.3 * 1.35, budget = y - fixedNeed - 30 - 6, allowed = Math.floor(budget / lineH);
            if (allowed >= 1) {
              var dl = wrap(e.details, helv, 9.3, R - M);
              if (dl.length > allowed) { dl = dl.slice(0, allowed); dl[allowed - 1] = dl[allowed - 1].replace(/\s+\S*$/, "") + "\u2026"; }
              y = sectionHead("WHAT YOU TOLD US", y);
              dl.forEach(function (l, i) { text(l, M, y - i * lineH, 9.3, helv, BODY); });
              y -= dl.length * lineH + 6;
            }
          }

          y = sectionHead("YOUR MINIMUM DISPATCH", y);
          y = tableHead(y, "INCLUDED IN EVERY DISPATCH", "AMOUNT (CAD)");
          y = tableRows(e.minimum, y) - 2;
          function totalRow(label, v, big) {
            if (big) { y -= 8; page.drawRectangle({ x: 330, y: y - 7, width: R - 330, height: 24, color: TINT }); }
            text(label, 340, y, big ? 11 : 9.5, big ? bold : helv, DARK);
            textRight(v, R - 8, y, big ? 13 : 9.5, bold, DARK);
            y -= big ? 24 : 14;
          }
          totalRow("Subtotal", money(e.subtotal), false);
          totalRow("HST (13%)", money(e.hst), false);
          totalRow("Minimum dispatch total", money(e.total), true);

          y = sectionHead("ADDITIONAL, ONLY IF REQUIRED", y);
          y = tableHead(y, "ITEM", "RATE (CAD, + HST)");
          y = tableRows(e.additional, y) - 4;

          y = sectionHead("HOW BILLING WORKS", y);
          e.notes.forEach(function (n) {
            page.drawRectangle({ x: M, y: y + 1, width: 4, height: 4, color: AMBER });
            y = para(n, M + 10, y, 8.6, helv, BODY, R - M - 10, 1.3) - 2;
          });
          y = sectionHead("TO BOOK", y);
          para("Call 1-888-482-4504 (24/7), text or WhatsApp 437-331-1609, or email quotes@amghydrovac.ca with this sheet number.", M, y, 8.8, helv, BODY, R - M);

          page.drawRectangle({ x: 0, y: 0, width: W, height: 40, color: INK });
          var foot1 = "$5M general liability  ·  $1M limited pollution  ·  $2M auto  ·  WSIB registered  ·  certificate of insurance on request";
          var foot2 = "13575993 Canada Inc. o/a AMG Hydrovac  ·  HST 761843507RT0001  ·  Dig safe. Dig once.";
          text(foot1, (W - helv.widthOfTextAtSize(foot1, 7.8)) / 2, 23, 7.8, helv, rgb(0.9, 0.91, 0.92));
          text(foot2, (W - helv.widthOfTextAtSize(foot2, 7.8)) / 2, 10, 7.8, helv, rgb(0.78, 0.8, 0.82));
          return doc.save();
        });
      });
    });
  }

  /* ---------- hooks used by main.js ---------- */
  window.AMGQuote = {
    prepare: function (form) {
      var e = compute(form);
      var t = form.querySelector('[name="ratesheet_minimum"]'), s = form.querySelector('[name="ratesheet_summary"]');
      if (t) t.value = money(e.total) + " incl. HST, minimum dispatch (" + e.id + ")";
      if (s) s.value = summaryText(e);
      var subj = form.querySelector('[name="subject"]');
      if (subj) subj.value = "Rate sheet " + e.id + " · " + (e.name || "Unknown") + (e.company ? " (" + e.company + ")" : "") + " · " + e.service + " · " + money(e.total) + " min · " + e.typeLabel;
      form.__estimate = e;
      return e;
    },
    show: function (form, mount) {
      var e = form.__estimate || compute(form);
      if (mount) render(e, mount);
      return e;
    },
    compute: compute,
    pdf: buildPdf
  };
})();
