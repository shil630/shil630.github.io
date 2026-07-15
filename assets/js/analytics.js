/* ===========================================================
   GA4 interaction events
   =========================================================== */
(function () {
  "use strict";

  var ENTRY_SOURCE_KEY = "positive-ev-entry-source";

  function track(eventName, params) {
    params = params || {};

    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
      return;
    }

    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push(Object.assign({ event: eventName }, params));
    }
  }

  function pathSlug() {
    var parts = window.location.pathname.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "home";
  }

  function contentSlug(element) {
    var owner = element && element.closest("[data-content-slug]");
    return (owner && owner.getAttribute("data-content-slug")) ||
      document.body.getAttribute("data-content-slug") ||
      pathSlug();
  }

  function readSessionSource() {
    try {
      return window.sessionStorage.getItem(ENTRY_SOURCE_KEY);
    } catch (error) {
      return null;
    }
  }

  function storeSessionSource(source) {
    try {
      window.sessionStorage.setItem(ENTRY_SOURCE_KEY, source);
    } catch (error) {
      // Storage can be unavailable in privacy modes; tracking should still work.
    }
  }

  function entrySource() {
    var utmSource = new URLSearchParams(window.location.search).get("utm_source");
    if (utmSource) {
      storeSessionSource(utmSource);
      return utmSource;
    }

    var storedSource = readSessionSource();
    if (storedSource) return storedSource;

    var source = "direct";
    if (document.referrer) {
      try {
        var referrer = new URL(document.referrer);
        source = referrer.origin === window.location.origin
          ? "internal"
          : referrer.hostname.replace(/^www\./, "");
      } catch (error) {
        source = "referral";
      }
    }

    storeSessionSource(source);
    return source;
  }

  // Capture the first-touch source even when a visitor enters through an article
  // and reaches a tool later without UTM parameters on the internal link.
  entrySource();

  document.querySelectorAll("[data-track-cta]").forEach(function (cta) {
    var eventType = cta.tagName === "FORM" ? "submit" : "click";
    cta.addEventListener(eventType, function () {
      track("cta_click", {
        placement: cta.getAttribute("data-placement") || "unknown",
        cta_type: cta.getAttribute("data-cta-type") || "unknown",
        content_slug: contentSlug(cta)
      });
    });
  });

  document.querySelectorAll(".subscribe-form").forEach(function (form) {
    form.addEventListener("submit", function () {
      track("newsletter_signup", {
        method: "buttondown",
        content_slug: contentSlug(form),
        placement: form.getAttribute("data-placement") || "unknown",
        page_location: window.location.pathname
      });
    });
  });

  window.siteAnalytics = {
    track: track,
    contentSlug: contentSlug,
    entrySource: entrySource
  };
})();
