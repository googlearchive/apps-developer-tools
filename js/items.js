// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('apps_dev_tool', function() {
  'use strict';

  /**
   * AppsDevTool constructor.
   * @constructor
   * @extends {HTMLDivElement}
   */
  function AppsDevTool() {}

  AppsDevTool.prototype = {
    __proto__: HTMLDivElement.prototype,

    /**
     * Perform initial setup.
     */
    initialize: function() {
      // Initialize overlays, set the default cancel overlay handler. Note,
      // other cancel overlay handlers may be added by specific overlays at
      // their initialization.
      var overlay = $('overlay');
      cr.ui.overlay.globalInitialization();
      cr.ui.overlay.setupOverlay(overlay);

      cr.ui.decorate('tabbox', cr.ui.TabBox);

      // Set up showing setting menu.
      document.querySelector('#settings-button').addEventListener('click',
          this.handleSettingsButtonClick_.bind(this));
      document.querySelector('#delete-all-behavior-item').addEventListener(
          'click', this.handleDeleteAllBehavior_.bind(this));
      // Set up hiding settings menu.
      document.addEventListener('click',
          this.handleHidingSettingsMenu_.bind(this));

      // Set up the three buttons (load unpacked, pack and update).
      document.querySelector('#apps-tab .load-unpacked').
          addEventListener('click', this.handleLoadUnpackedItem_.bind(this));
      document.querySelector('#extensions-tab .load-unpacked').
          addEventListener('click', this.handleLoadUnpackedItem_.bind(this));
      document.querySelector('#apps-tab .update-items-now').
          addEventListener('click', this.handleUpdateItemNow_.bind(this,
          document.querySelector('#apps-tab .update-items-progress')));
      document.querySelector('#extensions-tab .update-items-now').
          addEventListener('click', this.handleUpdateItemNow_.bind(this,
          document.querySelector('#extensions-tab .update-items-progress')));

      // Add Cmd-F / Ctrl-F shortcut to focus the search field.
      document.addEventListener('keydown', function(event) {
        if ((event.keyCode == 70) && (event.metaKey || event.ctrlKey)) {
          var overlay = AppsDevTool.getCurrentOverlay();
          (overlay ? overlay : $('extension-settings')).querySelector(
              'input[type="search"]').focus();
        }
      });

      // ESC will unfocus the search field.
      document.querySelector('#search').addEventListener(
          'keydown', function(event) {
        if (event.keyCode == 27) {
          document.querySelector('#search').blur();
          ItemList.loadItemsInfo();
        }
      });
      var packItemOverlay =
          apps_dev_tool.PackItemOverlay.getInstance().initializePage();
      var behaviorOverlay =
          apps_dev_tool.BehaviorWindow.getInstance().initializePage();
      extensions.ExtensionErrorOverlay.getInstance().initializePage(
          AppsDevTool.showOverlay);

      preventDefaultOnPoundLinkClicks();  // From webui/js/util.js
    },

    /**
     * Shows the settings menu.
     * @private
     */
    showSettingsMenu_: function() {
      $('settings-menu').style.display = 'block';
    },

    /**
     * Hides the settings menu.
     * @private
     */
    hideSettingsMenu_: function() {
      $('settings-menu').style.display = 'none';
    },

    /**
     * Returns true if the settings menu is displayed.
     * @return {!boolean} True, if the settings menu is displayed.
     * @private
     */
    isSettingsMenuShown_: function() {
      return $('settings-menu').style.display == 'block';
    },

    /**
     * Handles settings button click.
     * @param {!Event} e Click event.
     * @private
     */
    handleSettingsButtonClick_: function(e) {
      if (this.isSettingsMenuShown_())
        this.hideSettingsMenu_();
      else
        this.showSettingsMenu_();
    },

    /**
     * Handles hiding the settings menu.
     * @param {!Event} e Click event.
     * @private
     */
    handleHidingSettingsMenu_: function(e) {
      // If the click happens to be on the settings button, do nothing, the
      // button handler will perform the correct action.
      if (e.target && e.target.id == 'settings-button') {
        return
      }
      this.hideSettingsMenu_();
    },

    /**
     * Handles delete all extension and application behavior history menu item.
     * @param {!Event} e Click event.
     * @private
     */
    handleDeleteAllBehavior_: function(e) {
      this.hideSettingsMenu_();
      alertOverlay.setValues(
          chrome.i18n.getMessage('deleteAllBehaviorTitle'),
          chrome.i18n.getMessage('deleteAllBehaviorHeading'),
          chrome.i18n.getMessage('deleteButton'),
          chrome.i18n.getMessage('cancel'),
          function() {
            apps_dev_tool.BehaviorWindow.deleteAllExtensionBehaviorHistory();
            AppsDevTool.showOverlay(null);
          },
          function() {
            AppsDevTool.showOverlay(null);
          });
      AppsDevTool.showOverlay($('alertOverlay'));
    },

    /**
     * Handles the Load Unpacked Extension button.
     * @param {!Event} e Click event.
     * @private
     */
    handleLoadUnpackedItem_: function(e) {
      chrome.developerPrivate.loadUnpacked();
    },

    /**
     * Handles the Update Extension Now Button.
     * @param {!Element} tabNode Element containing the progress label.
     * @param {!Event} e Click event.
     * @private
     */
    handleUpdateItemNow_: function(progressLabelNode, e) {
      progressLabelNode.classList.add('updating');
      chrome.developerPrivate.autoUpdate(function(response) {
        // autoUpdate() will run too fast. We wait for 2 sec
        // before hiding the label so that the user can see it.
        setTimeout(function() {
          progressLabelNode.classList.remove('updating');
        }, 2000);
      });
    },
  };

  /**
   * Returns the current overlay or null if one does not exist.
   * @return {Element} The overlay element.
   */
  AppsDevTool.getCurrentOverlay = function() {
    return document.querySelector('#overlay .page.showing');
  };

  /**
   * Shows |el|. If there's another overlay showing, hide it.
   * @param {HTMLElement} el The overlay page to show. If falsey, all overlays
   *     are hidden.
   */
  AppsDevTool.showOverlay = function(el) {
    var currentlyShowingOverlay = AppsDevTool.getCurrentOverlay();
    if (currentlyShowingOverlay)
      currentlyShowingOverlay.classList.remove('showing');
    if (el)
      el.classList.add('showing');
    overlay.hidden = !el;
    uber.invokeMethodOnParent(el ? 'beginInterceptingEvents' :
                                   'stopInterceptingEvents');
  };

  /**
   * Loads translated strings.
   */
  AppsDevTool.initStrings = function() {
    i18nTemplate.process(document, loadTimeData);
  };

  return {
    AppsDevTool: AppsDevTool,
  };
});
