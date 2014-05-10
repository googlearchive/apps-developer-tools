// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

goog.provide('watchdog.BehaviorWindow');

goog.require('goog.bind');

/**
 * @constructor Object defining core functionality for the Watchdog window.
 */
watchdog.BehaviorWindow = function() {
  /**
   * Name of tab that is currently being displayed.
   * @private {!watchdog.BehaviorWindow.TabIds}
   */
  this.currentTab_ = watchdog.BehaviorWindow.TabIds.NONE;

  /**
   * Id of the currently selected extension.
   * @private {string}
   */
  this.currentExtensionId_ = '';

  /**
   * Filter to use when displaying activity info. See activityLogPrivate API for
   * details of valid filters.
   * @private {!ActivityFilter}
   */
  this.activityFilter_ = /** @type {!ActivityFilter} */ ({
    activityType: 'any',
    extensionId: '',
    apiCall: null,
    pageUrl: null,
    argUrl: null
  });

  // Initialize the window state.
  this.initialize();
};

/**
 * Enum for tab names. Used to show and hide the different information.
 * Only one should be shown at a time.
 * @enum {string}
 * @const
 */
watchdog.BehaviorWindow.TabIds = {
  HISTORY_MODE: 'history-mode-tab'
  STREAM_MODE: 'stream-mode-tab',
};

/**
 * Maximum number of notable calls to display on the UI.
 * @private {number}
 * @const
 */
watchdog.BehaviorWindow.MAX_NOTABLE_ = 10;

/**
 * Maximum line length for activity information on the UI.
 * @private {number}
 * @const
 */
watchdog.BehaviorWindow.MAX_LINE_LENGTH_ = 80;

/**
 * Initializes the window and some event handlers.
 */
watchdog.BehaviorWindow.prototype.initialize = function() {
  document.getElementById('close-behavior-overlay').addEventListener(
      'click', goog.bind(this.closeWindow, this), false);
};

/**
 * Closes the overlay window.
 */
watchdog.BehaviorWindow.prototype.closeWindow = function() {
  apps_dev_tool.AppsDevTool.showOverlay(null);
};
