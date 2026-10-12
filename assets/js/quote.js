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
    business:    { label: "Contractor / business",  hourly: 250, perBox: 250, emergency: 325 },
    municipal:   { label: "Municipality / utility", hourly: 250, perBox: 250, emergency: 325 },
    residential: { label: "Homeowner",              hourly: 270, perBox: 270, emergency: 375, hoseLabourer: 350 }
  };
  var MIN_HOURS = 4, TRAVEL_HOURS = 2, BOX_MIN = 4;
  var DISPOSAL_PER_LOAD = 450;                               // hauled to AMG's yard; at cost elsewhere
  var HOSE = [["up to 100 ft", 500], ["up to 200 ft", 750], ["up to 300 ft (maximum)", 1000]];
  var FLUSH = 150;
  var CONTAMINATED_PER_TONNE = 200;                        // impacted spoil that cannot go to AMG's yard
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
    minimum.push({ item: "Spoil disposal, 1 load", detail: "hauled to AMG's yard; disposal at any other site is billed at cost", amount: DISPOSAL_PER_LOAD });

    additional.push({ item: "Each additional load of spoil", detail: "hauled to AMG's yard; at cost at any other site", amount: money(DISPOSAL_PER_LOAD) });
    additional.push({ item: "Contaminated spoil disposal", detail: "impacted material, by scale weight", amount: money(CONTAMINATED_PER_TONNE) + " per tonne" });
    additional.push({ item: "Remote hose, flat, when the truck cannot park beside the dig", detail: HOSE.map(function (h) { return h[0] + " " + money(h[1]); }).join("  ·  "), amount: money(HOSE[0][1]) + " to " + money(HOSE[2][1]) });
    if (r.hoseLabourer) additional.push({ item: "Extra labourer when remote hose is used", detail: "flat per dispatch, in addition to the remote hose charge", amount: money(r.hoseLabourer) });
    additional.push({ item: "Flushing", detail: "when the job requires it", amount: money(FLUSH) });
    additional.push({ item: "Emergency, nights, weekends and holidays", detail: "in place of the standard hourly rate; dispatch answered 24/7", amount: money(r.emergency) + " per hour" });

    var subtotal = 0;
    minimum.forEach(function (l) { subtotal += l.amount; });
    var hst = Math.round(subtotal * HST * 100) / 100;

    notes.push("Billed from this minimum; anything beyond it is added at the rates above. Your invoice reflects actual hours and loads.");
    notes.push("Valid Ontario One Call locates are required before excavation; we confirm them and can arrange private locates.");
    notes.push("Rates valid for " + DAYS_VALID + " days from the date above. Canadian dollars; HST shown separately.");

    return {
      id: sheetId(), typeLabel: r.label, service: service || "Hydrovac services",
      minimum: minimum, additional: additional, notes: notes,
      subtotal: subtotal, hst: hst, total: subtotal + hst,
      timeline: val(form, "timeline"), address: val(form, "address"), region: val(form, "region"),
      details: val(form, "details"),
      name: val(form, "name"), company: val(form, "company"), email: val(form, "email"), phone: val(form, "phone")
    };
  }

  function summaryText(e) {
    var out = ["Rate sheet " + e.id + " (" + e.typeLabel + ") - " + e.service];
    e.minimum.forEach(function (l) { out.push(l.item + ": " + money(l.amount)); });
    out.push("Minimum dispatch: " + money(e.subtotal) + " + HST " + money(e.hst) + " = " + money(e.total));
    return out.join("\n");
  }

  /* ---------- on-screen panel ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render(e, mount) {
    var minRows = e.minimum.map(function (l) {
      return '<tr><td><strong>' + esc(l.item) + '</strong><br><span>' + esc(l.detail) + '</span></td><td class="estimate__amt">' + money(l.amount) + '</td></tr>';
    }).join("");
    var addRows = e.additional.map(function (l) {
      return '<tr><td><strong>' + esc(l.item) + '</strong><br><span>' + esc(l.detail) + '</span></td><td class="estimate__amt">' + esc(l.amount) + '</td></tr>';
    }).join("");
    mount.innerHTML =
      '<div class="estimate" id="estimate">' +
        '<div class="estimate__head"><span class="eyebrow">Your personalized rate sheet</span><h3>' + esc(e.service) + ' &middot; ' + esc(e.typeLabel) + '</h3>' +
        '<p class="estimate__id">Rate sheet ' + esc(e.id) + ' &middot; valid ' + DAYS_VALID + ' days</p></div>' +
        '<p class="estimate__label">Minimum dispatch</p>' +
        '<table class="estimate__table"><tbody>' + minRows + '</tbody>' +
        '<tfoot><tr><td>Subtotal</td><td class="estimate__amt">' + money(e.subtotal) + '</td></tr>' +
        '<tr><td>HST (13%)</td><td class="estimate__amt">' + money(e.hst) + '</td></tr>' +
        '<tr class="estimate__total"><td>Minimum dispatch total</td><td class="estimate__amt">' + money(e.total) + '</td></tr></tfoot></table>' +
        '<p class="estimate__label">Additional, only if required</p>' +
        '<table class="estimate__table estimate__table--add"><tbody>' + addRows + '</tbody></table>' +
        '<ul class="estimate__notes">' + e.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + '</ul>' +
        '<div class="estimate__actions">' +
          '<button class="btn" type="button" id="estimate-pdf">Download PDF rate sheet</button>' +
          '<a class="btn btn--ghost" href="tel:+18884824504">Call to book &middot; 1-888-482-4504</a>' +
          '<a class="btn btn--ghost" href="mailto:quotes@amghydrovac.ca?subject=' + encodeURIComponent('Booking - rate sheet ' + e.id) + '">Email to book</a>' +
        '</div>' +
        '<p class="form-note" id="estimate-status" aria-live="polite"></p>' +
      '</div>';
    var btn = mount.querySelector("#estimate-pdf"), status = mount.querySelector("#estimate-status");
    btn.addEventListener("click", function () {
      btn.disabled = true; btn.textContent = "Building your PDF…";
      buildPdf(e).then(function (bytes) {
        var blob = new Blob([bytes], { type: "application/pdf" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url; a.download = "AMG-Hydrovac-Rate-Sheet-" + e.id + ".pdf";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        btn.disabled = false; btn.textContent = "Download PDF rate sheet";
        status.textContent = "Your PDF is downloading. Call or email us with the sheet number when you are ready to book.";
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Download PDF rate sheet";
        status.textContent = "The PDF could not be built on this device. Your rate sheet is above; call 1-888-482-4504 and we send it to you.";
      });
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
              var detailLines = wrap(l.detail, helv, 8.5, 380);
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
          var today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
          text("PREPARED FOR", M, y, 11, anton, DARK, { characterSpacing: 0.6 });
          text("SHEET DETAILS", 330, y, 11, anton, DARK, { characterSpacing: 0.6 });
          y -= 6; page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 16;
          var left = [e.name, e.company, e.phone, e.email].filter(Boolean);
          if (e.address) left.push("Site: " + e.address + (e.region ? ", " + e.region : ""));
          var right = ["Sheet no.: " + e.id, "Date: " + today, "Customer type: " + e.typeLabel, "Service: " + e.service];
          if (e.timeline) right.push("Timing: " + e.timeline);
          var ly = y, ry = y;
          left.forEach(function (l) { ly = para(l, M, ly, 9.5, helv, BODY, 270); });
          right.forEach(function (l) { ry = para(l, 330, ry, 9.5, helv, BODY, R - 330); });
          y = Math.min(ly, ry) - 8;
          if (e.details) {
            y = sectionHead("WHAT YOU TOLD US", y);
            y = para(e.details.slice(0, 300), M, y, 9.3, helv, BODY, R - M) - 6;
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
          para("Call 1-888-482-4504 (24/7) or email quotes@amghydrovac.ca with this sheet number; we confirm scope, locates and date.", M, y, 8.8, helv, BODY, R - M);

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
