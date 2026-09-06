/* Minimal tool funnel. Only fixed tool/action identifiers leave the browser. */
(function () {
  "use strict";

  var script = document.currentScript;
  var toolId = script && script.getAttribute("data-tool-id");
  var measurementId = script && script.getAttribute("data-measurement-id");
  var actions = {
    "investment-checklist": ["edit", "save", "copy_text", "print"],
    "wechat-formatter": ["edit", "insert", "theme", "copy_rich", "copy_text", "download_html"],
    "preflop-range": ["select_position", "edit_range", "clear_range", "restore_range", "copy_range"]
  };
  var completions = {
    "investment-checklist": ["save", "copy_text"],
    "wechat-formatter": ["copy_rich", "copy_text", "download_html"],
    "preflop-range": ["copy_range"]
  };
  var started = false;
  var seen = Object.create(null);

  function emit(name, action) {
    if (!measurementId || !actions[toolId]) return;
    try {
      var params = {
        send_to: measurementId,
        tool_id: toolId,
        // Never send query strings, referrers or user-entered content in this funnel.
        page_location: window.location.origin + window.location.pathname,
        page_referrer: ""
      };
      if (action) params.action = action;
      // Standard Google tag command, consumed by the existing GTM-loaded tag.
      // Do not also push a custom GTM event or load a second Google tag.
      window.dataLayer = window.dataLayer || [];
      function command() { window.dataLayer.push(arguments); }
      command("event", name, params);
    } catch (_error) {
      // Analytics must never interrupt editing, saving or copying.
    }
  }

  function action(name) {
    if (!actions[toolId] || actions[toolId].indexOf(name) === -1) return;
    if (!started) {
      started = true;
      emit("tool_start", name);
    }
    // Count each action type once per page load, not each keystroke/matrix cell.
    if (!seen[name]) {
      seen[name] = true;
      emit("tool_action", name);
    }
  }

  window.toolAnalytics = {
    action: action,
    complete: function (name) {
      if (!completions[toolId] || completions[toolId].indexOf(name) === -1) return;
      action(name);
      emit("tool_complete", name);
    }
  };
  emit("tool_view");
})();
