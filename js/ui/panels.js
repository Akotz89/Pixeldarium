PS.ui = PS.ui || {};

PS.ui.panels = {
  setup: function() {
    this.sync();
  },
  sync: function() {
    if (typeof syncMenuState === "function") {
      syncMenuState();
    }

    if (typeof syncMenuPage === "function") {
      syncMenuPage();
    }
  },
  open: function() {
    return setMenuOpen(true);
  },
  close: function() {
    return setMenuOpen(false);
  },
  toggle: function() {
    return toggleMenuOpen();
  },
  setPage: function(pageName) {
    return setMenuPage(pageName);
  },
  updateInspect: function() {
    return updateInspectPanel();
  },
  updateEcosystem: function() {
    return updateEcosystemSummary();
  },
  updateSettlements: function() {
    return updateSettlementSummary();
  }
};
