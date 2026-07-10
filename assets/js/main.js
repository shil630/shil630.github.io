/* ===========================================================
   Interface language toggle (中 / EN) + post language filter
   =========================================================== */
(function () {
  "use strict";

  var LANG_KEY = "site-lang";
  var FILTER_KEY = "post-filter";

  /* ---------- Interface language (nav labels, about page) ---------- */
  function applyLang(lang) {
    // Text nodes with data-zh / data-en
    document.querySelectorAll("[data-zh][data-en]").forEach(function (el) {
      var val = el.getAttribute(lang === "en" ? "data-en" : "data-zh");
      if (val !== null) el.textContent = val;
    });
    // Whole blocks: .lang-zh / .lang-en
    document.querySelectorAll(".lang-zh").forEach(function (el) {
      el.hidden = lang !== "zh";
    });
    document.querySelectorAll(".lang-en").forEach(function (el) {
      el.hidden = lang !== "en";
    });
    document.documentElement.setAttribute("data-ui-lang", lang);
  }

  function getLang() {
    return localStorage.getItem(LANG_KEY) || "zh";
  }

  var toggle = document.getElementById("lang-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = getLang() === "zh" ? "en" : "zh";
      localStorage.setItem(LANG_KEY, next);
      applyLang(next);
    });
  }
  applyLang(getLang());

  /* ---------- Post language filter (home + archive) ---------- */
  var chips = document.querySelectorAll(".filter-chip");
  var items = document.querySelectorAll(".post-item, .archive-item");
  var emptyHint = document.querySelector(".empty-hint");

  function applyFilter(filter) {
    var visible = 0;
    items.forEach(function (item) {
      var show = filter === "all" || item.getAttribute("data-lang") === filter;
      item.style.display = show ? "" : "none";
      if (show) visible++;
    });
    if (emptyHint) emptyHint.hidden = visible !== 0;
    chips.forEach(function (c) {
      c.classList.toggle("active", c.getAttribute("data-filter") === filter);
    });
    // Hide archive year groups that have no visible items
    document.querySelectorAll(".archive-year").forEach(function (group) {
      var groupItems = group.querySelectorAll(".archive-item");
      var any = Array.prototype.some.call(groupItems, function (i) {
        return i.style.display !== "none";
      });
      group.style.display = any ? "" : "none";
    });
  }

  if (chips.length) {
    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        var f = chip.getAttribute("data-filter");
        localStorage.setItem(FILTER_KEY, f);
        applyFilter(f);
      });
    });
    applyFilter(localStorage.getItem(FILTER_KEY) || "all");
  }

  /* ---------- Analytics: newsletter signup ---------- */
  // Fire a GA4 event when the subscribe form is submitted.
  // Guarded so it silently no-ops when gtag isn't present (local/dev).
  document.querySelectorAll(".subscribe-form").forEach(function (form) {
    form.addEventListener("submit", function () {
      if (typeof window.gtag === "function") {
        window.gtag("event", "newsletter_signup", {
          method: "buttondown",
          page_location: window.location.pathname
        });
      }
    });
  });

  // Track which free tool readers explicitly join the waitlist for.
  document.querySelectorAll(".tool-waitlist-form").forEach(function (form) {
    form.addEventListener("submit", function () {
      var selected = form.querySelector('input[name="tag"]:checked');
      if (selected && typeof window.gtag === "function") {
        window.gtag("event", "tool_waitlist_vote", {
          tool: selected.value,
          page_location: window.location.pathname
        });
      }
    });
  });
})();
