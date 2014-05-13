// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('apps_dev_tool', function() {
  'use strict';

/** const */ var AppsDevTool = apps_dev_tool.AppsDevTool;

  /**
   * DeleteBehaviorOverlay class
   * Encapsulated handling of the 'Delete Behavior History' overlay page.
   * @constructor
   */
  function DeleteBehaviorOverlay() {}

  cr.addSingletonGetter(DeleteBehaviorOverlay);

  DeleteBehaviorOverlay.prototype = {
    initializePage: function() {
      var overlay = $('overlay');
      cr.ui.overlay.setupOverlay(overlay);
      cr.ui.overlay.globalInitialization();
      overlay.addEventListener('cancelOverlay', this.hideOverlay_.bind(this));

      $('delete-behavior-dismiss').addEventListener('click',
          this.hideOverlay_.bind(this));
      $('delete-behavior-commit').addEventListener('click',
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
     * Handles a click on the delete behavior history.
     * @private
     */
    handleCommit_: function() {
      apps_dev_tool.BehaviorWindow.deleteExtensionBehaviorHistory(function() {
        AppsDevTool.showOverlay($('behaviorOverlay'));
      });
    },
  };

  // Export
  return {
    DeleteBehaviorOverlay: DeleteBehaviorOverlay,
  };
});
