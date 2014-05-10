// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('apps_dev_tool', function() {
  'use strict';

/** const */ var AppsDevTool = apps_dev_tool.AppsDevTool;

  /**
   * Hides the present overlay showing.
   */
  var hideOverlay = function() {
    AppsDevTool.showOverlay(null);
  };

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
      overlay.addEventListener('cancelOverlay', hideOverlay.bind(this));

      $('delete-behavior-dismiss').addEventListener('click',
          hideOverlay.bind(this));
      $('delete-behavior-commit').addEventListener('click',
          this.handleCommit_.bind(this));
    },

    /**
     * Handles a click on the delete behavior history.
     * @param {Event} e The click event.
     * @private
     */
    handleCommit_: function(e) {
      hideOverlay();
    },
  };

  // Export
  return {
    DeleteBehaviorOverlay: DeleteBehaviorOverlay,
  };
});
