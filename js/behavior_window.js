// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
goog.require('goog.bind');

cr.define('apps_dev_tool', function() {
  'use strict';

  /** const*/ var AppsDevTool = apps_dev_tool.AppsDevTool;

  /**
   * BehaviorWindow class
   * Encapsulated handling of the 'Behavior' overlay page.
   * @constructor
   */
  function BehaviorWindow() {}

  cr.addSingletonGetter(BehaviorWindow);

  /**
   * Enum for tab names. Used to show and hide the different information.
   * Only one should be shown at a time.
   * @enum {string}
   * @const
   */
  BehaviorWindow.TabIds = {
    HISTORY_MODE: 'history-mode-tab',
    STREAM_MODE: 'stream-mode-tab',
    NOSELECTION_MODE: 'no-tab'
  };

  /**
   * Hides the present overlay showing and clear all generated activity
   * lists.
   */
  var hideOverlay = function() {
    BehaviorWindow.clearSummaryViewActivities();
    AppsDevTool.showOverlay(null);
  };


  BehaviorWindow.prototype = {
    /**
     * Maximum number of notable calls to display on the UI.
     * @private {number}
     * @const
     */
    MAX_NOTABLE_: 10,

    /**
     * Maximum line length for activity information on the UI.
     * @private {number}
     * @const
     */
    MAX_LINE_LENGTH_: 80,

    /**
     * Id of the currently selected extension.
     * @private {string}
     */
    currentExtensionId_: '',

    /**
     * Name of the currently selected extension.
     * @private {string}
     */
    currentExtensionName_: '',

    /**
     * Name of tab that is currently being displayed.
     * @private {!watchdog.BehaviorWindow.TabIds}
     */
    currentTab_: BehaviorWindow.TabIds.NOSELECTION_MODE,

    /**
     * Filter to use when displaying activity info. See activityLogPrivate API
     * for details of valid filters.
     * @private {!ActivityFilter}
     */
    activityFilter_: /** @type {!ActivityFilter} */ ({
      activityType: 'any',
      extensionId: '',
      apiCall: null,
      pageUrl: null,
      argUrl: null
    }),

    initializePage: function() {
      var overlay = $('behaviorOverlay');
      cr.ui.overlay.setupOverlay(overlay);
      cr.ui.overlay.globalInitialization();
      $('close-behavior-overlay').addEventListener(
          'click', hideOverlay.bind(this));
      $('delete-behavior-button').addEventListener(
          'click', BehaviorWindow.showDeleteBehaviorOverlay.bind(this));
    },
  };

  /**
   * Show the BehaviorWindow overlay for the item metadata
   * given in |item|..
   * @param {!Object} item A dictionary of item metadata. (from items_lists.js)
   */
  BehaviorWindow.showOverlay = function(item) {
    // Update the selected extenion icon and title.
    $('behavior-extension-icon').style.backgroundImage =
        'url(' + item.icon_url + ')';
    $('behavior-extension-title').textContent = item.name;

    // Set the filter to point at the newly selected extension.
    this.instance_.currentExtensionId_ = item.id;
    this.instance_.currentExtensionName_ = item.name;
    this.instance_.activityFilter_.extensionId =
        this.instance_.currentExtensionId_;

    // Before showing BehaviorWindow, a user does not choose any tab.
    this.instance_.currentTab_ = BehaviorWindow.TabIds.NOSELECTION_MODE;
    // Shows the history tab page initially.
    this.setVisibleTab(BehaviorWindow.TabIds.HISTORY_MODE);
    AppsDevTool.showOverlay($('behaviorOverlay'));
  };

  /**
   * Loads the activities for the extension from the DB.
   * Notable activities are also displayed in a different list.
   */
  BehaviorWindow.refreshActivityList = function() {
    this.clearSummaryViewActivities();
    if (this.instance_.currentTab_ != BehaviorWindow.TabIds.HISTORY_MODE ||
        !this.instance_.currentExtensionId_) {
      return;
    }
    var callback = this.addToSummaryModeLists.bind(this);
    watchdog.ActivityGroupList.getFilteredExtensionActivities(
        this.instance_.activityFilter_, callback);
  };

  /**
   * Adds activities from the result set to the summary mode lists.
   * @param {!watchdog.ActivityGroupList} activityList
   */
  BehaviorWindow.addToSummaryModeLists = function(activityList) {
      if (!activityList) {
        return;
      }
      var numNotable = 0;
      var numRegular = 0;
      activityList.getActivityGroups().forEach(function(group) {
        if (numNotable < this.instance_.MAX_NOTABLE_ && group.isNotable()) {
          this.addToNotableActivityList(group);
          numNotable++;
        }
        this.addToAllActivityList(group);
        numRegular++;
      }, this);

      // Only show the notable section if there are notable activities.
      if (numNotable > 0) {
        $('summary-mode-tab-notable').style.display = 'block';
      } else {
        $('summary-mode-tab-notable').style.display = 'none';
      }

      if (numRegular == 0) {
        $('empty-history').style.display = 'block';
      }
  };

  /**
   * Cleans the details from the summary mode view.
   */
  BehaviorWindow.clearSummaryViewActivities = function() {
    // Clear the history tab
    this.clearActivityCountList('activity-list-notable');
    this.clearActivityCountList('activity-list-all');
    $('empty-history').style.display = 'none';

    // Clear the realtime tab
    this.clearActivityCountList('activity-list-dev');
  };

  /**
   * Checks if the notable activity list has entries.
   * @return {boolean} True if the notable activity list has entries.
   */
  BehaviorWindow.hasNotableActivityList = function() {
    return $('activity-list-notable').innerText != '';
  };

  /**
   * Adds an activity to the notable activity list.
   * @param {!watchdog.ActivityGroup} group Activity group to add to the
   *     list.
   */
  BehaviorWindow.addToNotableActivityList = function(group) {
   this.addActivityToSummaryCountList(group, 'activity-list-notable');
  };

  /**
   * Adds an activity to the full activity list.
   * @param {!watchdog.ActivityGroup} group Activity group to add to list.
   */
  BehaviorWindow.addToAllActivityList = function(group) {
   this.addActivityToSummaryCountList(group, 'activity-list-all');
  };

  /**
   * Delete all generated activity children templates of a given listName
   * @param {string} listName Name of the list to delete. Should be the name
   *     of an existing div that can contain activity count info.
   */
  BehaviorWindow.clearActivityCountList = function(listName) {
    var parentNode = document.getElementById(listName);
    if (parentNode) {
      parentNode.innerHTML = '';
    }
  };
  /**
   * Adds an activity to the DB summary counts list.
   * @param {!watchdog.ActivityGroup} group Group to add to the list.
   * @param {string} listName Name of the list to add this to. Should be the
   *     name of an existing div that can contain activity count info.
   */
  BehaviorWindow.addActivityToSummaryCountList = function(group, listName) {
    var activitiesTemplate = document.querySelector(
        '#template-collection > [data-name="activity-list-count"]');
    var el = activitiesTemplate.cloneNode(true);
    el.setAttribute('data-id', group.getName() + '-count');

    document.getElementById(listName).appendChild(el);
    el.querySelector('#count').innerText = this.countText(
        group.getTotalCount());
    el.querySelector('#action').innerText = group.getName();

    // Set the page URL and make it link to the URL.
    var pageLink = el.querySelector('#pageURL-dev');
    var pageUrl = group.getUrl();
    pageLink.href = pageUrl;
    if (pageUrl.length > this.instance_.MAX_LINE_LENGTH_)
      pageUrl = pageUrl.substring(0, this.instance_.MAX_LINE_LENGTH_) + '...';
    pageLink.innerText = pageUrl;

    var activityCounts = group.getActivityCounts();
    var detailList = el.querySelector('#detail-list');
    var showToggle = false;

    for (var activity in activityCounts) {
      var listItem = document.createElement('li');
      listItem.appendChild(document.createTextNode(
          activity + ' ' + this.countText(activityCounts[activity])));
      detailList.appendChild(listItem);
      showToggle = true;
    }

    if (!showToggle) {
      el.querySelector('#item-arrow').style.visibility = 'hidden';
    } else {
      el.querySelector('#detail').style.display = 'none';
      el.querySelector('#item-toggle').addEventListener(
          'click', function() {
            BehaviorWindow.toggleDetailVisibility(el);
          }, false);
      el.querySelector('#action').addEventListener(
          'click', function() {
            BehaviorWindow.toggleDetailVisibility(el);
          }, false);
    }
  };

  /**
   * Toggles the visibility of a detail box.
   * @param {Element} elem Element containing a detail box and an arrow image.
   */
  BehaviorWindow.toggleDetailVisibility = function(elem) {
    var box = elem.querySelector('#detail');
    var arrow = elem.querySelector('#item-arrow');

    var visibility = box.style.display;
    if (visibility == 'block') {
      box.style.display = 'none';
      arrow.src = 'images/arrow_more.png';
    } else {
      box.style.display = 'block';
      arrow.src = 'images/arrow_less.png';
    }
  };

  /**
   *  Displays the appropriate elements for the current tab.
   */
  BehaviorWindow.refreshVisibleTab = function() {
    if (this.instance_.currentTab_ == BehaviorWindow.TabIds.HISTORY_MODE) {
      $('history-tab').className = 'current-tab';
      $('summary-mode-tab-all').style.display = 'block';
    } else if (this.instance_.currentTab_ ==
               BehaviorWindow.TabIds.STREAM_MODE) {
      $('realtime-tab').className = 'current-tab';
      $('dev-mode-tab-content').style.display = 'block';
      // TODO(spostman): Implement start.
      // this.start();
    }
    this.refreshActivityList();
  };

  /**
   * Makes the tab visible and hides all others.
   * @param {watchdog.Watchdog.TabIds} tabId Name of the tab to show.
   */
  BehaviorWindow.setVisibleTab = function(tabId) {
    if (this.instance_.currentTab_ == tabId) {
      return;
    }
    // Clean up the state from the last tab.
    if (this.instance_.currentTab_ == BehaviorWindow.TabIds.HISTORY_MODE) {
      $('history-tab').className = '';
      $('summary-mode-tab-notable').style.display = 'none';
      $('summary-mode-tab-all').style.display = 'none';
    } else if (this.instance_.currentTab_ ==
               BehaviorWindow.TabIds.STREAM_MODE) {
      $('realtime-tab').className = '';
      $('dev-mode-tab-content').style.display = 'none';
      // TODO(spostman): Implement stop.
      // this.stop();
    }
    // Now set up the new tab.
    this.instance_.currentTab_ = tabId;
    this.refreshVisibleTab();
  };

  /**
   * Get text for displaying a count.
   * @param {number} count to display.
   * @return {string} Text to display containing the count value.
   */
  BehaviorWindow.countText = function(count) {
    // Don't need to support the <=0 case because it can't happen.
    // TODO(karenlees): If this is ever internationalized to more languages
    // (like Polish), this will need to be modified to handle arbitrarily
    // numbers of plurality.
    if (count == 1)
      return '(' + chrome.i18n.getMessage('countHistoryOne') + ')';
    else
      return '(' + chrome.i18n.getMessage(
          'countHistoryMultiple', [count]) + ')';
  };

  /**
   * Shows the delete behavior overlay which deletes behavior history for
   * the current extension or application.
   */
  BehaviorWindow.showDeleteBehaviorOverlay = function() {
    $('delete-behavior-extension-id').textContent =
        this.currentExtensionName_ + '?';
    AppsDevTool.showOverlay($('deleteBehaviorOverlay'));
  };

  /**
   * Deletes behavior history of the current extension/app.
   * @param {Function=} callback Function to call when deletion is done.
   */
  BehaviorWindow.deleteExtensionBehaviorHistory = function(callback) {
    var filter = {
      extensionId: this.instance_.currentExtensionId_,
      activityType: 'any'
    };

    // activityLogPrivate.getExtensionActivities returns maximum 300 activities.
    // This limit is hard-coded in Chrome. Thus, we can delete 300 activities at
    // most at a time.
    var recursiveDelete = function() {
      chrome.activityLogPrivate.getExtensionActivities(
        filter, function(activitySet) {
            var activityIds = [];
            for (var i = 0; i < activitySet.activities.length; i++) {
              activityIds.push(activitySet.activities[i].activityId);
            }
            if (!activityIds.length) {
              BehaviorWindow.refreshVisibleTab();
              if (callback)
                callback();
              return;
            }
            chrome.activityLogPrivate.deleteActivities(activityIds);
            recursiveDelete();
        });
    };

    recursiveDelete();
  };

  /**
   * Deletes behavior database and thus behavior history of all extensions and
   * applications.
   */
  BehaviorWindow.deleteAllExtensionBehaviorHistory = function() {
    chrome.activityLogPrivate.deleteDatabase();
  };

  // Export
  return {
    BehaviorWindow: BehaviorWindow
  };
});
