// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
goog.require('goog.bind');

cr.define('apps_dev_tool', function() {
  'use strict';

  /** const*/ var AppsDevTool = apps_dev_tool.AppsDevTool;

  /**
   * Hides the present overlay showing.
   */
  var hideOverlay = function() {
    AppsDevTool.showOverlay(null);
  };

  /**
   * BehaviorWindow class
   * Encapsulated handling of the 'Behavior' overlay page.
   * @constructor
   */
  function BehaviorWindow() {}

  cr.addSingletonGetter(BehaviorWindow);

  BehaviorWindow.prototype = {
    initializePage: function() {
      var overlay = $('behaviorOverlay');
      cr.ui.overlay.setupOverlay(overlay);
      cr.ui.overlay.globalInitialization();
      $('close-behavior-overlay').addEventListener('click',
          hideOverlay.bind(this));
    },
  };

  /**
   * Enum for tab names. Used to show and hide the different information.
   * Only one should be shown at a time.
   * @enum {string}
   * @const
   */
  BehaviorWindow.TabIds = {
    HISTORY_MODE: 'history-mode-tab',
    STREAM_MODE: 'stream-mode-tab'
  };

  /**
   * Maximum number of notable calls to display on the UI.
   * @private {number}
   * @const
   */
  BehaviorWindow.MAX_NOTABLE_ = 10;

  /**
   * Maximum line length for activity information on the UI.
   * @private {number}
   * @const
   */
  BehaviorWindow.MAX_LINE_LENGTH_ = 80;

  /**
   * Name of tab that is currently being displayed.
   * @private {!watchdog.BehaviorWindow.TabIds}
   */
  BehaviorWindow.currentTab_ = BehaviorWindow.TabIds.HISTORY_MODE;

  /**
   * Id of the currently selected extension.
   * @private {string}
   */
  BehaviorWindow.currentExtensionId_ = '';

  /**
   * Filter to use when displaying activity info. See activityLogPrivate API
   * for details of valid filters.
   * @private {!ActivityFilter}
   */
  BehaviorWindow.activityFilter_ = /** @type {!ActivityFilter} */ ({
    activityType: 'any',
    extensionId: '',
    apiCall: null,
    pageUrl: null,
    argUrl: null
  });

  // Export
  return {
    BehaviorWindow: BehaviorWindow,
  };
});
