/* =================================================================
   AMG HYDROVAC — instant estimate + PDF (contact.html)
   Vanilla JS, no build step. pdf-lib + fontkit are fetched from a CDN
   only when the visitor asks for the PDF. Rates: owner, 2026-10-12.
   ================================================================= */
(function () {
  "use strict";

  var RATES = {
    business:    { label: "Contractor / business",   hourly: 250, minHours: 4, travelHours: 2, perBox: 250, boxMin: 4 },
    municipal:   { label: "Municipality / utility",  hourly: 250, minHours: 4, travelHours: 2, perBox: 250, boxMin: 4 },
    residential: { label: "Homeowner / one-time job", hourly: 270, minHours: 4, travelHours: 2, perBox: 270, boxMin: 4 }
  };
  var HOSE = { "100": 500, "200": 750, "300": 1000 };   // remote hose, flat, by length (300 ft is the maximum)
  var DISPOSAL_PER_LOAD = 450;                           // hauled to AMG's yard
  var FLUSH = 150;                                       // when required
  var HST = 0.13;
  var ESTIMATE_DAYS_VALID = 30;

  function money(n) { return "$" + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? String(el.value || "").trim() : ""; }
  function estimateId() {
    var d = new Date(), p = function (n) { return (n < 10 ? "0" : "") + n; };
    return "AMG-" + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes());
  }

  /* ---------- the estimate ---------- */
  function compute(form) {
    var typeKey = val(form, "customer_type") || "business";
    var r = RATES[typeKey] || RATES.business;
    var service = val(form, "service");
    var isBoxJob = /water box/i.test(service);
    var hose = val(form, "hose") || "0";
    var disposal = val(form, "disposal") || "yard";
    var lines = [], notes = [];

    if (isBoxJob) {
      var asked = parseInt(val(form, "boxes"), 10) || r.boxMin;
      var boxes = Math.max(asked, r.boxMin);
      lines.push({ item: "Water box / curb stop work", detail: boxes + (boxes === 1 ? " box" : " boxes") + " x " + money(r.perBox) + (asked < r.boxMin ? " (" + r.boxMin + "-box minimum per dispatch)" : ""), amount: boxes * r.perBox });
      notes.push("Water boxes are priced per box with a " + r.boxMin + "-box minimum per dispatch; the hourly minimum does not apply.");
    } else {
      var askedH = parseFloat(val(form, "hours")) || 0;
      var hours = Math.max(askedH, r.minHours);
      lines.push({ item: "Hydrovac and operator on site", detail: hours + " hours x " + money(r.hourly) + "/hour" + (askedH < r.minHours ? " (" + r.minHours + "-hour minimum)" : ""), amount: hours * r.hourly });
      notes.push(r.minHours + "-hour minimum per dispatch; time on site is billed to the half hour after that at " + money(r.hourly) + "/hour.");
    }
    lines.push({ item: "Travel (mobilization and demobilization)", detail: r.travelHours + " hours x " + money(r.hourly) + "/hour, flat per dispatch", amount: r.travelHours * r.hourly });
    if (HOSE[hose]) {
      lines.push({ item: "Remote hose", detail: "up to " + hose + " ft from the truck, flat", amount: HOSE[hose] });
    }
    if (disposal === "site") {
      lines.push({ item: "Spoil disposal", detail: "at the facility you specify, billed at cost", amount: null });
      notes.push("Disposal at a facility you specify is billed at cost; hauling to AMG's yard is " + money(DISPOSAL_PER_LOAD) + " per load.");
    } else {
      lines.push({ item: "Spoil disposal", detail: "1 load hauled to AMG's yard x " + money(DISPOSAL_PER_LOAD) + " (additional loads " + money(DISPOSAL_PER_LOAD) + " each)", amount: DISPOSAL_PER_LOAD });
    }
    var subtotal = 0;
    lines.forEach(function (l) { if (l.amount) subtotal += l.amount; });
    var hst = Math.round(subtotal * HST * 100) / 100;
    notes.push("Flushing, when a job requires it, is " + money(FLUSH) + " per dispatch and is not included above.");
    notes.push("Nights, weekends, holidays and emergency call-outs are quoted when you call 1-888-482-4504.");
    notes.push("Based on the details you entered. We will not exceed this estimate by more than 10% without your approval first.");
    notes.push("Valid utility locates (Ontario One Call) are required before excavation; we confirm them and can arrange private locates.");
    notes.push("Estimate valid for " + ESTIMATE_DAYS_VALID + " days. All amounts in Canadian dollars; HST extra as shown.");
    return {
      id: estimateId(),
      typeLabel: r.label,
      service: service || "Hydrovac services",
      lines: lines, notes: notes,
      subtotal: subtotal, hst: hst, total: subtotal + hst,
      hoseLabel: HOSE[hose] ? "Remote hose up to " + hose + " ft" : "Truck beside the dig",
      disposalLabel: disposal === "site" ? "Facility you specify (at cost)" : "Hauled to AMG's yard",
      timeline: val(form, "timeline") || "",
      address: val(form, "address") || "",
      region: val(form, "region") || "",
      details: val(form, "details") || "",
      name: val(form, "name"), company: val(form, "company"), email: val(form, "email"), phone: val(form, "phone")
    };
  }

  function summaryText(e) {
    var out = ["Estimate " + e.id + " (" + e.typeLabel + ") - " + e.service];
    e.lines.forEach(function (l) { out.push(l.item + ": " + (l.amount === null ? "at cost" : money(l.amount)) + " (" + l.detail + ")"); });
    out.push("Subtotal " + money(e.subtotal) + " | HST " + money(e.hst) + " | Total " + money(e.total));
    return out.join("\n");
  }

  /* ---------- on-screen panel ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function render(e, mount) {
    var rows = e.lines.map(function (l) {
      return '<tr><td><strong>' + esc(l.item) + '</strong><br><span>' + esc(l.detail) + '</span></td><td class="estimate__amt">' + (l.amount === null ? "at cost" : money(l.amount)) + '</td></tr>';
    }).join("");
    mount.innerHTML =
      '<div class="estimate" id="estimate">' +
        '<div class="estimate__head"><span class="eyebrow">Your instant estimate</span><h3>' + esc(e.service) + ' &middot; ' + esc(e.typeLabel) + '</h3>' +
        '<p class="estimate__id">Estimate ' + esc(e.id) + ' &middot; valid ' + ESTIMATE_DAYS_VALID + ' days</p></div>' +
        '<table class="estimate__table"><tbody>' + rows + '</tbody>' +
        '<tfoot><tr><td>Subtotal</td><td class="estimate__amt">' + money(e.subtotal) + '</td></tr>' +
        '<tr><td>HST (13%)</td><td class="estimate__amt">' + money(e.hst) + '</td></tr>' +
        '<tr class="estimate__total"><td>Estimated total</td><td class="estimate__amt">' + money(e.total) + '</td></tr></tfoot></table>' +
        '<ul class="estimate__notes">' + e.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + '</ul>' +
        '<div class="estimate__actions">' +
          '<button class="btn" type="button" id="estimate-pdf">Download PDF estimate</button>' +
          '<a class="btn btn--ghost" href="tel:+18884824504">Call to book &middot; 1-888-482-4504</a>' +
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
        a.href = url; a.download = "AMG-Hydrovac-Estimate-" + e.id + ".pdf";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
        btn.disabled = false; btn.textContent = "Download PDF estimate";
        status.textContent = "Your PDF is downloading. Email or text it to us when you are ready to book.";
      }).catch(function () {
        btn.disabled = false; btn.textContent = "Download PDF estimate";
        status.textContent = "The PDF could not be built on this device. Your estimate is above; call 1-888-482-4504 and we send it to you.";
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
    ]).then(function (res) { return res[2]; });
    return libs;
  }

  function buildPdf(e) {
    return ensureLibs().then(function (antonBytes) {
      var PDFLib = window.PDFLib, rgb = PDFLib.rgb;
      var AMBER = rgb(0.961, 0.651, 0.137), INK = rgb(0.055, 0.067, 0.086), DARK = rgb(0.067, 0.078, 0.047),
          BODY = rgb(0.24, 0.267, 0.302), GREY = rgb(0.42, 0.463, 0.51), LINE = rgb(0.86, 0.87, 0.89), TINT = rgb(0.996, 0.965, 0.906), WHITE = rgb(1, 1, 1);
      return PDFLib.PDFDocument.create().then(function (doc) {
        doc.registerFontkit(window.fontkit);
        return Promise.all([doc.embedFont(antonBytes), doc.embedFont(PDFLib.StandardFonts.Helvetica), doc.embedFont(PDFLib.StandardFonts.HelveticaBold)]).then(function (fonts) {
          var anton = fonts[0], helv = fonts[1], bold = fonts[2];
          var W = 612, H = 792, M = 46, R = W - M;
          var page = doc.addPage([W, H]);
          doc.setTitle("AMG Hydrovac estimate " + e.id);
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

          // header band
          page.drawRectangle({ x: 0, y: H - 82, width: W, height: 82, color: INK });
          page.drawRectangle({ x: M, y: H - 70, width: 58, height: 58, color: AMBER });
          text("A", M + 18, H - 60, 38, anton, DARK);
          text("AMG HYDROVAC", M + 74, H - 44, 24, anton, WHITE);
          text("NON-DESTRUCTIVE HYDRO EXCAVATION", M + 74, H - 60, 7.5, bold, AMBER, { characterSpacing: 1.6 });
          textRight("INSTANT ESTIMATE", R, H - 36, 15, anton, WHITE);
          textRight("1-888-482-4504  ·  quotes@amghydrovac.ca  ·  amghydrovac.ca", R, H - 56, 8.5, helv, rgb(0.9, 0.91, 0.92));

          var y = H - 112;
          // prepared for / scope
          var today = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
          text("PREPARED FOR", M, y, 11, anton, DARK, { characterSpacing: 0.6 });
          text("ESTIMATE DETAILS", 330, y, 11, anton, DARK, { characterSpacing: 0.6 });
          y -= 6; page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 16;
          var left = [e.name, e.company, e.phone, e.email].filter(Boolean);
          if (e.address) left.push("Site: " + e.address + (e.region ? ", " + e.region : ""));
          var right = ["Estimate no.: " + e.id, "Date: " + today, "Customer type: " + e.typeLabel, "Service: " + e.service, "Access: " + e.hoseLabel, "Disposal: " + e.disposalLabel];
          if (e.timeline) right.push("Timing: " + e.timeline);
          var ly = y, ry = y;
          left.forEach(function (l) { ly = para(l, M, ly, 9.5, helv, BODY, 270); });
          right.forEach(function (l) { ry = para(l, 330, ry, 9.5, helv, BODY, R - 330); });
          y = Math.min(ly, ry) - 8;
          if (e.details) {
            text("WHAT YOU TOLD US", M, y, 11, anton, DARK, { characterSpacing: 0.6 }); y -= 6;
            page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 16;
            y = para(e.details.slice(0, 600), M, y, 9.3, helv, BODY, R - M) - 8;
          }

          // table
          text("ESTIMATE", M, y, 11, anton, DARK, { characterSpacing: 0.6 }); y -= 6;
          page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 22;
          page.drawRectangle({ x: M, y: y - 4, width: R - M, height: 18, color: INK });
          text("ITEM", M + 8, y + 1, 8, bold, WHITE, { characterSpacing: 0.8 });
          textRight("AMOUNT (CAD)", R - 8, y + 1, 8, bold, WHITE);
          y -= 22;
          e.lines.forEach(function (l, i) {
            var rowTop = y + 10;
            var detailLines = wrap(l.detail, helv, 8.5, 380);
            var rowH = 16 + detailLines.length * 11;
            if (i % 2 === 0) page.drawRectangle({ x: M, y: rowTop - rowH, width: R - M, height: rowH, color: rgb(0.97, 0.975, 0.98) });
            text(l.item, M + 8, y - 2, 10, bold, DARK);
            detailLines.forEach(function (d, k) { text(d, M + 8, y - 14 - k * 11, 8.5, helv, GREY); });
            textRight(l.amount === null ? "at cost" : money(l.amount), R - 8, y - 2, 10.5, bold, DARK);
            y -= rowH;
            page.drawRectangle({ x: M, y: y + 10 - 1, width: R - M, height: 0.6, color: LINE });
          });
          y -= 8;
          function totalRow(label, v, big) {
            if (big) { y -= 8; page.drawRectangle({ x: 330, y: y - 7, width: R - 330, height: 24, color: TINT }); }
            text(label, 340, y, big ? 11 : 9.5, big ? bold : helv, DARK);
            textRight(v, R - 8, y, big ? 13 : 9.5, bold, DARK);
            y -= big ? 26 : 16;
          }
          totalRow("Subtotal", money(e.subtotal), false);
          totalRow("HST (13%)", money(e.hst), false);
          totalRow("Estimated total", money(e.total), true);
          y -= 6;

          // notes
          text("HOW THIS ESTIMATE WORKS", M, y, 11, anton, DARK, { characterSpacing: 0.6 }); y -= 6;
          page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 15;
          e.notes.forEach(function (n) {
            page.drawRectangle({ x: M, y: y + 1, width: 4, height: 4, color: AMBER });
            y = para(n, M + 10, y, 8.8, helv, BODY, R - M - 10) - 3;
          });
          y -= 6;
          text("TO BOOK", M, y, 11, anton, DARK, { characterSpacing: 0.6 }); y -= 6;
          page.drawRectangle({ x: M, y: y, width: R - M, height: 1.4, color: AMBER }); y -= 15;
          y = para("Call 1-888-482-4504 (answered 24/7) or email quotes@amghydrovac.ca with this estimate number. We confirm the scope, the locates and the date, then send a written quote with the same numbers. $5M general liability, $1M limited pollution, $2M auto; WSIB registered; certificate of insurance on request.", M, y, 9, helv, BODY, R - M);

          // footer
          page.drawRectangle({ x: 0, y: 0, width: W, height: 34, color: INK });
          var foot = "13575993 Canada Inc. o/a AMG Hydrovac  ·  HST 761843507RT0001  ·  Dig safe. Dig once.";
          text(foot, (W - helv.widthOfTextAtSize(foot, 8)) / 2, 13, 8, helv, rgb(0.78, 0.8, 0.82));
          return doc.save();
        });
      });
    });
  }

  /* ---------- hooks used by main.js ---------- */
  window.AMGQuote = {
    // Fill the hidden estimate fields so the lead email carries the number quoted.
    prepare: function (form) {
      var e = compute(form);
      var t = form.querySelector('[name="estimate_total"]'), s = form.querySelector('[name="estimate_summary"]');
      if (t) t.value = money(e.total) + " incl. HST (" + e.id + ")";
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

  // Water-box count only matters for water box jobs.
  var svc = document.getElementById("service"), boxesField = document.getElementById("boxes-field");
  if (svc && boxesField) {
    var toggle = function () { boxesField.hidden = !/water box/i.test(svc.value); };
    svc.addEventListener("change", toggle); toggle();
  }
})();
