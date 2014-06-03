// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
  var hideBehaviorOverlay = function() {
    // Check if ESC was pressed on search box of behavior overlay. If that is
    // the case, clear the search results and unfocus the search box.
    if (document.activeElement.id == 'behavior-search') {
      var search = $('behavior-search');
      search.value = '';
      search.blur();
      BehaviorWindow.updateSearch();
      return;
    }
    BehaviorWindow.stop();
    BehaviorWindow.clearRealtimeTab();
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
     * @private {!apps_dev_tool.BehaviorWindow.TabIds}
     */
    currentTab_: BehaviorWindow.TabIds.NOSELECTION_MODE,

    /**
     * Search filter entered to a search box.
     * @private {!string}
     */
    currentSearchFilter_: '',

    /**
     * The timeout that handles pauses during searches.
     * @private {number}
     */
    searchTimeout_: null,

    /**
     * Listener on the chrome.activityLogPrivate.onExtensionActivity event.
     * We need to keep track of it so the correct listener is removed when the
     * stop button is pressed.
     * @private {Function}
     */
    activityListener_: null,

    initializePage: function() {
      $('behavior-overlay').addEventListener(
          'cancelOverlay', hideBehaviorOverlay);
      $('delete-behavior-button').addEventListener(
          'click', BehaviorWindow.deleteBehavior.bind(this));

      $('behavior-search').addEventListener(
          'keydown', BehaviorWindow.onSearchKeyDown.bind(BehaviorWindow));
      $('behavior-search').addEventListener(
          'input', BehaviorWindow.onSearchInput.bind(BehaviorWindow));

      var setVisibleTab = BehaviorWindow.setVisibleTab.bind(BehaviorWindow);
      $('history-tab').addEventListener('click', function() {
          setVisibleTab(BehaviorWindow.TabIds.HISTORY_MODE);
        }, false);
      $('realtime-tab').addEventListener('click', function() {
          setVisibleTab(BehaviorWindow.TabIds.STREAM_MODE);
        }, false);

      // Register event handler for realtime panel buttons.
      var start = BehaviorWindow.start.bind(BehaviorWindow);
      $('realtime-start').addEventListener('click', start, false);
      var pause = BehaviorWindow.stop.bind(BehaviorWindow);
      $('realtime-pause').addEventListener('click', pause, false);
      var clear = BehaviorWindow.clearDeveloperModeViewActivities.bind(
          BehaviorWindow);
      $('realtime-clear').addEventListener('click', clear, false);
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

    // Before showing BehaviorWindow, a user does not choose any tab.
    this.instance_.currentTab_ = BehaviorWindow.TabIds.NOSELECTION_MODE;
    // Shows the history tab page initially.
    this.setVisibleTab(BehaviorWindow.TabIds.HISTORY_MODE);
    AppsDevTool.showOverlay($('behavior-overlay'));
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

    var filters = [];
    var search = this.instance_.currentSearchFilter_;
    if (search == "") {
      // No search filter => simply find all matching extension activities
      filters.push({
          activityType: 'any',
          extensionId: this.instance_.currentExtensionId_,
          apiCall: null,
          pageUrl: null,
          argUrl: null
      });
    } else {
      // Exact search by API name
      filters.push({
          activityType: 'any',
          extensionId: this.instance_.currentExtensionId_,
          apiCall: search,
          pageUrl: null,
          argUrl: null
      });
      // Substring search by page URL ("%" acts as wildcard)
      filters.push({
          activityType: 'any',
          extensionId: this.instance_.currentExtensionId_,
          apiCall: null,
          pageUrl: "%" + search + "%",
          argUrl: null
      });
      // Substring search by argument URL
      filters.push({
          activityType: 'any',
          extensionId: this.instance_.currentExtensionId_,
          apiCall: null,
          pageUrl: null,
          argUrl: "%" + search + "%"
      });
    }

    apps_dev_tool.ActivityGroupList.getFilteredExtensionActivities(
        filters, callback);
  };

  /**
   * Adds activities from the result set to the summary mode lists.
   * @param {!apps_dev_tool.ActivityGroupList} activityList
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
        $('summary-mode-tab-all').setAttribute('class', 'separator');
      } else {
        $('summary-mode-tab-notable').style.display = 'none';
        $('summary-mode-tab-all').setAttribute('class', '');
      }

      if (numRegular == 0) {
        $('empty-history').style.display = 'block';
      }
  };

  /**
   * Listens on the activity log api and adds activities.
   * @param {!ExtensionActivity} activity An activity from the
   *     activityLogPrivate api.
   */
  BehaviorWindow.onExtensionActivity = function(activity) {
    if (activity.extensionId == this.instance_.currentExtensionId_) {
      var act = new apps_dev_tool.Activity(activity);
      BehaviorWindow.addToDevActivityList(act);
    }
  };

  /**
   * Clear the buttons and activities of the history tab.
   */
  BehaviorWindow.clearHistoryTab = function() {
    this.clearSummaryViewActivities();
    $('delete-behavior-button').style.display = 'none';
  };

  /**
   * Clear the buttons and activities of the realtime tab.
   */
  BehaviorWindow.clearRealtimeTab = function() {
    this.clearDeveloperModeViewActivities();
    $('realtime-start').style.display = 'none';
    $('realtime-pause').style.display = 'none';
    $('realtime-clear').style.display = 'none';
  };

  /**
   * Clear the history activities.
   */
  BehaviorWindow.clearSummaryViewActivities = function() {
    this.clearActivityCountList('activity-list-notable');
    this.clearActivityCountList('activity-list-all');
    $('empty-history').style.display = 'none';
  };

  /**
   * Clear the realtime activities.
   */
  BehaviorWindow.clearDeveloperModeViewActivities = function() {
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
   * @param {!apps_dev_tool.ActivityGroup} group Activity group to add to the
   *     list.
   */
  BehaviorWindow.addToNotableActivityList = function(group) {
   this.addActivityToSummaryCountList(group, 'activity-list-notable');
  };

  /**
   * Adds an activity to the full activity list.
   * @param {!apps_dev_tool.ActivityGroup} group Activity group to add to list.
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
   * @param {!apps_dev_tool.ActivityGroup} group Group to add to the list.
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
    var deleteButton = el.querySelector('#delete-activity-button');
    deleteButton.addEventListener(
        'click', BehaviorWindow.deleteBehaviorGroup.bind(this, group));

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
      $('history-tab-panel').className = 'current-tab';
      $('history-tab-panel').selected = 'selected';
      $('realtime-tab-panel').className = '';
      $('summary-mode-tab-all').style.display = 'block';
      $('delete-behavior-button').style.display = 'block';
    } else if (this.instance_.currentTab_ ==
               BehaviorWindow.TabIds.STREAM_MODE) {
      $('realtime-tab-panel').className = 'current-tab';
      $('realtime-tab-panel').selected = 'selected';
      $('history-tab-panel').className = '';
      $('dev-mode-tab-content').style.display = 'block';
      this.start();
    }
    this.refreshActivityList();
  };

  /**
   * Makes the tab visible and hides all others.
   * @param {apps_dev_tool.Watchdog.TabIds} tabId Name of the tab to show.
   */
  BehaviorWindow.setVisibleTab = function(tabId) {
    if (this.instance_.currentTab_ == tabId) {
      return;
    }
    // Clean up the state from the last tab.
    if (this.instance_.currentTab_ == BehaviorWindow.TabIds.HISTORY_MODE) {
      $('history-tab-panel').className = '';
      $('summary-mode-tab-all').style.display = 'none';
      $('summary-mode-tab-notable').style.display = 'none';
      $('delete-behavior-button').style.display = 'none';
    } else if (this.instance_.currentTab_ ==
               BehaviorWindow.TabIds.STREAM_MODE) {
      $('realtime-tab-panel').className = '';
      $('dev-mode-tab-content').style.display = 'none';
      // Stop activity log listener.
      this.stop();
      // Clear the realtime panel buttons.
      $('realtime-start').style.display = 'none';
      $('realtime-pause').style.display = 'none';
      $('realtime-clear').style.display = 'none';
    }
    // Clear behavior-search button and value.
    $('behavior-search').value = '';
    this.instance_.currentSearchFilter_ = '';
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
   * Starts the reamtime mode listening for activity.
   */
  BehaviorWindow.start = function() {
    // Don't bother adding a listener if there is no extension selected.
    if (!this.instance_.currentExtensionId_) {
      return;
    }

    if (!this.instance_.activityListener_) {
      this.instance_.activityListener_ = this.onExtensionActivity.bind(this);
    }
    this.updateDevModeControls(true);
    chrome.activityLogPrivate.onExtensionActivity.addListener(
        this.instance_.activityListener_);
  };

  /**
   * Stops listening on the activity log.
   */
  BehaviorWindow.stop = function() {
    chrome.activityLogPrivate.onExtensionActivity.removeListener(
        this.instance_.activityListener_);
    this.updateDevModeControls(false);
  };

  /**
   * Updates which buttons are visible in developer mode.
   * @param {boolean} running True if it is listening for activity.
   */
  BehaviorWindow.updateDevModeControls = function(running) {
    if (running) {
       $('realtime-start').style.display = 'none';
       $('realtime-pause').style.display = 'block';
       $('realtime-clear').style.display = 'block';
    } else {
       $('realtime-pause').style.display = 'none';
       $('realtime-start').style.display = 'block';
       $('realtime-clear').style.display = 'block';
    }
  };

  /**
   * Adds an activity to the developer mode activity list.
   * @param {!watchdog.Activity} activity Activity to add to the list.
   */
  BehaviorWindow.addToDevActivityList = function(activity) {
    // Check if there is a search filter set and if the current activity matches
    // the search filter.
    var filter = this.instance_.currentSearchFilter_;
    var filterLower = filter.toLowerCase();
    if (filter != '' &&
        activity.getArgUrl().toLowerCase().indexOf(filterLower) == -1 &&
        activity.getPageUrl().toLowerCase().indexOf(filterLower) == -1 &&
        activity.getApiCall().indexOf(filter) == -1)
      return;

    var activitiesTemplate = document.querySelector(
        '#template-collection > [data-name="activity-list-dev"]');
    var el = activitiesTemplate.cloneNode(true);
    el.setAttribute('data-id', activity.getExtensionId() + '-dev');

    document.getElementById('activity-list-dev').appendChild(el);
    el.querySelector('#time-dev').innerText = activity.getTime();
    el.querySelector('#action-dev').innerText =
        activity.getDevModeActionString();

    // Set the page URL and make it link to the URL.
    var pageLink = el.querySelector('#pageURL-dev');
    var pageUrl = activity.getPageUrl();
    pageLink.href = pageUrl;

    if (pageUrl.length > this.instance_.MAX_LINE_LENGTH_) {
      pageUrl = pageUrl.substring(0, this.instance_.MAX_LINE_LENGTH_) + '...';
    }
    pageLink.innerText = pageUrl;

    // Add the list of arguments. If there are arguments default them to hidden
    // and add the listener on the arrow so they can be expanded.
    var showToggle = false;
    var argsList = el.querySelector('#args-dev');
    var args = activity.getArgs();
    args.forEach(function(arg) {
      var listItem = document.createElement('li');
      listItem.appendChild(document.createTextNode(JSON.stringify(arg)));
      argsList.appendChild(listItem);
      showToggle = true;
    });

    var webRequestDetails = activity.getWebRequest();
    if (webRequestDetails != null) {
      var webRequestList = el.querySelector('#webrequest-details');
      for (var key in webRequestDetails) {
        if (webRequestDetails.hasOwnProperty(key)) {
          var listItem = document.createElement('li');
          listItem.appendChild(document.createTextNode(
              key + ': ' + JSON.stringify(webRequestDetails[key])));
          webRequestList.appendChild(listItem);
          showToggle = true;
        }
      }
    }

    if (showToggle) {
      el.querySelector('#detail').style.display = 'none';
      el.querySelector('#activity-toggle-dev').addEventListener(
          'click', function() {
            BehaviorWindow.toggleDetailVisibility(el);
          }, false);
      el.querySelector('#action-dev').addEventListener(
          'click', function() {
            BehaviorWindow.toggleDetailVisibility(el);
          }, false);
    } else {
      el.querySelector('#item-arrow').style.visibility = 'hidden';
    }
  };

  /*
   * Shows the delete behavior overlay which deletes behavior history for
   * the current extension or application.
   */
  BehaviorWindow.deleteBehavior = function() {
    alertOverlay.setValues(
        chrome.i18n.getMessage('deleteBehaviorTitle'),
        chrome.i18n.getMessage('deleteBehaviorHeading') + ' ' +
            this.currentExtensionName_ + '?',
        chrome.i18n.getMessage('deleteButton'),
        chrome.i18n.getMessage('cancel'),
        function() {
          apps_dev_tool.BehaviorWindow.deleteExtensionBehaviorHistory(
              function() {
                AppsDevTool.showOverlay($('behavior-overlay'));
              });
        },
        function() {
          AppsDevTool.showOverlay($('behavior-overlay'));
        });
    AppsDevTool.showOverlay($('alertOverlay'));
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
   * Deletes activities that represent a behavior group from the database.
   * @param {!apps_dev_tool.ActivityGroup} group Group of activities to remove
   *    from the database.
   */
  BehaviorWindow.deleteBehaviorGroup = function(group) {
    var activityIds = group.getActivityIds();
    if (!activityIds.length)
      return;
    chrome.activityLogPrivate.deleteActivities(activityIds);
    BehaviorWindow.refreshActivityList();
  };

  /**
   * Deletes behavior database and thus behavior history of all extensions and
   * applications.
   */
  BehaviorWindow.deleteAllExtensionBehaviorHistory = function() {
    chrome.activityLogPrivate.deleteDatabase();
  };

  /**
   * Updates displayed activities according to the current value of the search.
   */
  BehaviorWindow.updateSearch = function() {
    if (this.instance_.currentSearchFilter_ == $('behavior-search').value)
      return;
    this.instance_.currentSearchFilter_ =
        $('behavior-search').value;
    if (this.instance_.currentTab_ == BehaviorWindow.TabIds.HISTORY_MODE) {
      this.refreshActivityList();
    } else if (this.instance_.currentTab_ ==
               BehaviorWindow.TabIds.STREAM_MODE) {
      this.clearDeveloperModeViewActivities();
    }
  };

  /**
   * Adjusts the list of displayed activities according to search input.
   * If the user pauses for more than 500ms, search will happen automatically.
   * @param {!Event} event Key event.
   */
  BehaviorWindow.onSearchKeyDown = function(event) {
    clearTimeout(this.instance_.searchTimeout_);
    if (event.keyCode != 13) {  // Enter key.
      this.instance_.searchTimeout_ = setTimeout(
          function() {
            BehaviorWindow.updateSearch();
          }, 500);
      return;
    }
    BehaviorWindow.updateSearch();
  };

  /**
   * Handles click on cancel button of the search box through onInput event.
   * @param {!Event} event Key event.
   */
  BehaviorWindow.onSearchInput = function(event) {
    if ($('behavior-search').value == '')
      BehaviorWindow.updateSearch();
  };

  // Export
  return {
    BehaviorWindow: BehaviorWindow
  };
});
