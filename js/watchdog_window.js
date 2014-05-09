// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor Object defining core functionality for the Watchdog window.
 */
watchdog.WatchdogWindow = function() {
  /**
   * Name of tab that is currently being displayed.
   * @private {!watchdog.WatchdogWindow.TabIds}
   */
  this.currentTab_ = watchdog.WatchdogWindow.TabIds.NONE;

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
};

/**
 * Enum for tab names. Used to show and hide the different information.
 * Only one should be shown at a time.
 * @enum {string}
 * @const
 */
watchdog.WatchdogWindow.TabIds = {
  SUMMARY_MODE: 'summary-mode-tab'
  DEVELOPER_MODE: 'dev-mode-tab',
};

/**
 * Maximum number of notable calls to display on the UI.
 * @private {number}
 * @const
 */
watchdog.WatchdogWindow.MAX_NOTABLE_ = 10;

/**
 * Maximum line length for activity information on the UI.
 * @private {number}
 * @const
 */
watchdog.WatchdogWindow.MAX_LINE_LENGTH_ = 80;
