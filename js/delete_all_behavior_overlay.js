// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('apps_dev_tool', function() {
  'use strict';

/** const */ var AppsDevTool = apps_dev_tool.AppsDevTool;

  /**
   * DeleteAllBehaviorOverlay class
   * Encapsulated handling of the delete ALL behavior history overlay page and
   * functionality that implements deletion of behavior history for ALL
   * extensions and applications. This overlay is invoked by the item in the
   * settings menu, and it returns to the main window when it finishes.
   * @constructor
   */
  function DeleteAllBehaviorOverlay() {}

  cr.addSingletonGetter(DeleteAllBehaviorOverlay);

  DeleteAllBehaviorOverlay.prototype = {
    initializePage: function() {
      var overlay = $('overlay');
      cr.ui.overlay.setupOverlay(overlay);
      cr.ui.overlay.globalInitialization();
      overlay.addEventListener('cancelOverlay', this.hideOverlay_.bind(this));

      $('delete-all-behavior-dismiss').addEventListener('click',
          this.hideOverlay_.bind(this));
      $('delete-all-behavior-commit').addEventListener('click',
          this.handleCommit_.bind(this));
    },

    /**
     * Hides the present overlay showing.
     * @private
     */
    hideOverlay_: function() {
      AppsDevTool.showOverlay(null);
    },

    /**
     * Handles a click on the delete all behavior history.
     * @param {Event} e The click event.
     * @private
     */
    handleCommit_: function(e) {
      chrome.activityLogPrivate.deleteDatabase();
      this.hideOverlay_();
    },
  };

  // Export
  return {
    DeleteAllBehaviorOverlay: DeleteAllBehaviorOverlay,
  };
});
