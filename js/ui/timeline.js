PS.ui = PS.ui || {};

PS.ui.timeline = (function() {
  function getEvents() {
    var events = Array.isArray(world.timelineEvents) ? world.timelineEvents : [];

    return events.slice().sort(function(a, b) {
      var tickDelta = (Number(a.tick) || 0) - (Number(b.tick) || 0);

      if (tickDelta !== 0) {
        return tickDelta;
      }

      return (Number(a.deepTime) || 0) - (Number(b.deepTime) || 0);
    });
  }

  function getFilter() {
    return String(world.timelineFilter || "all");
  }

  function eventMatchesFilter(event, filter) {
    var normalizedFilter = String(filter || "all");
    var type = String(event.type || "").toLowerCase();
    var category = String(event.category || "").toLowerCase();

    if (normalizedFilter === "all") {
      return true;
    }

    return type.indexOf(normalizedFilter) >= 0 || category === normalizedFilter;
  }

  function getFilteredEvents() {
    var filter = getFilter();

    return getEvents().filter(function(event) {
      return eventMatchesFilter(event, filter);
    });
  }

  function formatEventTime(event) {
    var deepTime = Number(event.deepTime);

    if (Number.isFinite(deepTime) && Math.abs(deepTime) >= 1000000) {
      return (deepTime / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + "M years";
    }

    if (Number.isFinite(deepTime) && Math.abs(deepTime) >= 1000) {
      return (deepTime / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "K years";
    }

    if (Number.isFinite(deepTime) && deepTime !== 0) {
      return deepTime.toLocaleString(undefined, { maximumFractionDigits: 0 }) + " years";
    }

    return "T" + escapeSummaryText(event.tick || 0);
  }

  function getEventFocusLabel(event) {
    if (event.inspectTarget && event.inspectTarget.type === "tile") {
      return "tile " + event.inspectTarget.x + "," + event.inspectTarget.y;
    }

    if (event.location) {
      return Number(event.location.latitude || 0).toFixed(1) + " / " +
        Number(event.location.longitude || 0).toFixed(1);
    }

    return "no focus";
  }

  function makeEventButton(event, index) {
    var selected = world.selectedTimelineEvent &&
      world.selectedTimelineEvent.type === event.type &&
      world.selectedTimelineEvent.tick === event.tick;
    var className = "timeline-event timeline-" + escapeSummaryText(event.category || event.type || "event");

    if (selected) {
      className += " selected";
    }

    return (
      "<button class=\"" + className + "\" type=\"button\" data-timeline-index=\"" + index + "\">" +
      "<span class=\"timeline-time\">" + formatEventTime(event) + "</span>" +
      "<span class=\"timeline-copy\">" +
      "<b>" + escapeSummaryText(event.label || "Event") + "</b>" +
      "<span>" + escapeSummaryText(event.detail || event.details || "") + "</span>" +
      "</span>" +
      "<span class=\"timeline-meta\">" + escapeSummaryText(event.category || "event") + " / " + escapeSummaryText(getEventFocusLabel(event)) + "</span>" +
      "</button>"
    );
  }

  function focusEvent(event) {
    world.selectedTimelineEvent = {
      type: event.type || "event",
      tick: Number(event.tick) || 0,
      deepTime: Number(event.deepTime) || 0
    };

    if (event.inspectTarget && event.inspectTarget.type === "tile" && typeof inspectTile === "function") {
      inspectTile(event.inspectTarget.x, event.inspectTarget.y, true);
      return true;
    }

    if (event.inspectTarget && event.inspectTarget.type === "tile" && typeof focusPlanetViewOnTile === "function") {
      focusPlanetViewOnTile(event.inspectTarget.x, event.inspectTarget.y);
      world.needsRender = true;
      return true;
    }

    if (event.location && typeof focusPlanetViewOnLatLon === "function") {
      focusPlanetViewOnLatLon(event.location.latitude, event.location.longitude);
      world.needsRender = true;
      return true;
    }

    return false;
  }

  function syncFilters() {
    for (var i = 0; i < timelineFilterButtons.length; i++) {
      var button = timelineFilterButtons[i];
      var isActive = button.getAttribute("data-timeline-filter") === getFilter();

      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.className = isActive ? "active" : "";
    }
  }

  function sync() {
    var events = getFilteredEvents();
    var html = [];

    syncFilters();

    if (events.length === 0) {
      setElementClass(timelineList, "timeline-list empty");
      setElementText(timelineList, "TIMELINE: Waiting for " + getFilter() + " events");
      return;
    }

    for (var i = 0; i < events.length; i++) {
      html.push(makeEventButton(events[i], i));
    }

    setElementClass(timelineList, "timeline-list");
    setElementHtml(timelineList, html.join(""));
  }

  function setup() {
    for (var i = 0; i < timelineFilterButtons.length; i++) {
      timelineFilterButtons[i].addEventListener("click", function(event) {
        world.timelineFilter = event.currentTarget.getAttribute("data-timeline-filter") || "all";
        sync();
      });
    }

    timelineList.addEventListener("click", function(event) {
      var target = event.target.closest("[data-timeline-index]");

      if (!target) {
        return;
      }

      var events = getFilteredEvents();
      var selectedEvent = events[Number(target.getAttribute("data-timeline-index")) || 0];

      if (selectedEvent) {
        focusEvent(selectedEvent);
        sync();
      }
    });

    sync();
  }

  return {
    setup: setup,
    sync: sync,
    getFilteredEvents: getFilteredEvents,
    focusEvent: focusEvent
  };
})();
