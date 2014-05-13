// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
   * PackItemOverlay class
   * Encapsulated handling of the 'Pack Item' overlay page.
   * @constructor
   */
  function PackItemOverlay() {}

  cr.addSingletonGetter(PackItemOverlay);

  PackItemOverlay.prototype = {
    initializePage: function() {
      $('pack-item-dismiss').addEventListener('click',
          hideOverlay.bind(this));
      $('pack-item-commit').addEventListener('click',
          this.handleCommit_.bind(this));
      $('browse-private-key').addEventListener('click',
          this.handleBrowsePrivateKey_.bind(this));
    },

    /**
     * Handles a click on the pack button.
     * @param {Event} e The click event.
     * @private
     */
    handleCommit_: function(e) {
      var itemPath = $('item-root-dir').value;
      var privateKeyPath = $('item-private-key').value;
      chrome.developerPrivate.packDirectory(
          itemPath, privateKeyPath, 0, this.onCommit_);
    },

    /**
     * Handles a commit on the pack request.
     * @param {string} response Message returned by packing api.
     * @private
     */
    onCommit_: function(response) {
      if (response.status == 'SUCCESS')
        PackItemOverlay.showSuccessMessage(response);
      else if (response.status == 'ERROR')
        PackItemOverlay.showError(response);
      else
        PackItemOverlay.showWarningMessage(response);
    },

    /**
     * Handles the showing of the item private key file.
     * @param {Event} e Change event.
     * @private
     */
    handleBrowsePrivateKey_: function(e) {
      chrome.developerPrivate.choosePath('FILE', 'PEM', function(filePath) {
        $('item-private-key').value = filePath || '';
      });
    },
  };

  /**
   * Wrap up the pack process by showing the success |message| and closing
   * the overlay.
   * @param {string} message The message to show to the user.
   */
  PackItemOverlay.showSuccessMessage = function(response) {
    alertOverlay.setValues(
        chrome.i18n.getMessage('packExtensionOverlay'),
        response.message,
        chrome.i18n.getMessage('ok'),
        '',
        hideOverlay,
        null);
    AppsDevTool.showOverlay($('alertOverlay'));
  };

  /**
   * An alert overlay showing |message|, and upon acknowledgement, close
   * the alert overlay and return to showing the PackItemOverlay.
   * @param {string} message The message to show to the user.
   */
  PackItemOverlay.showError = function(response) {
    alertOverlay.setValues(
        chrome.i18n.getMessage('packExtensionErrorTitle'),
        response.message /* message returned by the packiing api */,
        chrome.i18n.getMessage('ok'),
        '',
        function() {
          AppsDevTool.showOverlay($('packItemOverlay'));
        },
        null);
    AppsDevTool.showOverlay($('alertOverlay'));
  };

  /**
   * An alert overlay showing |message| as warning and proceeding after the
   * user confirms the action.
   * @param {response} response returned by the packItem API.
   */
  PackItemOverlay.showWarningMessage = function(response) {
    alertOverlay.setValues(
        chrome.i18n.getMessage('packExtensionWarningTitle'),
        response.message /* message returned by the packing api */,
        chrome.i18n.getMessage('packExtensionProceedAnyway'),
        chrome.i18n.getMessage('cancel'),
        function() {
          chrome.developerPrivate.packDirectory(
              response.item_path,
              response.pem_path,
              response.override_flags,
              PackItemOverlay.showSuccessMessage);
          hideOverlay();
        },
        hideOverlay);
    AppsDevTool.showOverlay($('alertOverlay'));
  };

  /**
   * DeleteAllBehaviorOverlay class.
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
      $('delete-all-behavior-dismiss').addEventListener('click',
          hideOverlay.bind(this));
      $('delete-all-behavior-commit').addEventListener('click',
          this.handleCommit_.bind(this));
    },

    /**
     * Handles a click on the delete all behavior history.
     * @private
     */
    handleCommit_: function() {
      apps_dev_tool.BehaviorWindow.deleteAllExtensionBehaviorHistory();
      hideOverlay();
    },
  };

  /**
   * DeleteBehaviorOverlay class.
   * Encapsulated handling of the delete behavior history overlay page and
   * functionality that implements deletion of behavior history for a particular
   * extension/application. This overlay is invoked from the behavior window
   * overlay and returns to it when closed.
   * @constructor
   */
  function DeleteBehaviorOverlay() {}

  cr.addSingletonGetter(DeleteBehaviorOverlay);

  DeleteBehaviorOverlay.prototype = {
    initializePage: function() {
      $('delete-behavior-dismiss').addEventListener('click',
          this.handleCancel_.bind(this));
      $('delete-behavior-commit').addEventListener('click',
          this.handleCommit_.bind(this));
    },

    /**
     * Hides the present overlay and shows the behavior overlay.
     * @private
     */
    handleCancel_: function() {
      AppsDevTool.showOverlay($('behaviorOverlay'));
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
    PackItemOverlay: PackItemOverlay,
    DeleteAllBehaviorOverlay: DeleteAllBehaviorOverlay,
    DeleteBehaviorOverlay: DeleteBehaviorOverlay,
  };
});
