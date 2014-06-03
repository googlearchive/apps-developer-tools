// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Provides dialog-like behaviors for the tracing UI.
 */
cr.define('cr.ui.overlay', function() {
  /**
   * Gets the top, visible overlay page.
   * @return {HTMLElement} The overlay page.
   */
  function getTopOverlayPage() {
    return document.querySelector('#overlay .page.showing');
  }

  /**
   * Returns a visible default button of the overlay page, if it has one. If the
   * overlay has more than one, the first one will be returned.
   *
   * @param {HTMLElement} overlay The .overlay.
   * @return {HTMLElement} The default button.
   */
  function getDefaultButton(overlay) {
    function isHidden(node) { return node.hidden; }
    var defaultButtons =
        overlay.querySelectorAll('.button-strip > .default-button');
    for (var i = 0; i < defaultButtons.length; i++) {
      if (!findAncestor(defaultButtons[i], isHidden))
        return defaultButtons[i];
    }
    return null;
  }

  /** @type {boolean} */
  var globallyInitialized = false;

  /**
   * Makes initializations which must hook at the document level.
   */
  function globalInitialization() {
    if (!globallyInitialized) {
      document.addEventListener('keydown', function(e) {
        var overlay = getTopOverlayPage();
        if (!overlay)
          return;

        // Close the overlay on escape.
        if (e.keyCode == 27)  // Escape
          cr.dispatchSimpleEvent(overlay, 'cancelOverlay');

        // Execute the overlay's default button on enter, unless focus is on an
        // element that has standard behavior for the enter key.
        var forbiddenTagNames = /^(A|BUTTON|SELECT|TEXTAREA)$/;
        if (e.keyIdentifier == 'Enter' &&
            !forbiddenTagNames.test(document.activeElement.tagName)) {
          var button = getDefaultButton(overlay);
          if (button) {
            button.click();
            // Executing the default button may result in focus moving to a
            // different button. Calling preventDefault is necessary to not have
            // that button execute as well.
            e.preventDefault();
          }
        }
      });

      window.addEventListener('resize', setMaxHeightAllPages);
      globallyInitialized = true;
    }

    setMaxHeightAllPages();
  }

  /**
   * Sets the max-height of all pages in all overlays, based on the window
   * height.
   */
  function setMaxHeightAllPages() {
    var pages = document.querySelectorAll('.overlay .page');

    var maxHeight = Math.min(0.9 * window.innerHeight, 640) + 'px';
    for (var i = 0; i < pages.length; i++)
      pages[i].style.maxHeight = maxHeight;
  }

  /**
   * Adds behavioral hooks for the given overlay.
   * @param {HTMLElement} overlay The .overlay.
   */
  function setupOverlay(overlay) {
    // Close the overlay on clicking any of the pages' close buttons.
    var pages = overlay.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      var closeButtons = page.querySelectorAll('.close-button');
      for (var k = 0; k < closeButtons.length; k++) {
        closeButtons[k].addEventListener('click', function(e) {
          cr.dispatchSimpleEvent(page, 'cancelOverlay');
        });
      }
    }

    // Remove the 'pulse' animation any time the overlay is hidden or shown.
    overlay.__defineSetter__('hidden', function(value) {
      this.classList.remove('pulse');
      if (value)
        this.setAttribute('hidden', true);
      else
        this.removeAttribute('hidden');
    });
    overlay.__defineGetter__('hidden', function() {
      return this.hasAttribute('hidden');
    });

    // Shake when the user clicks away.
    overlay.addEventListener('click', function(e) {
      // Only pulse if the overlay was the target of the click.
      if (this != e.target)
        return;

      // This may be null while the overlay is closing.
      var overlayPage = this.querySelector('.page:not([hidden])');
      if (overlayPage)
        overlayPage.classList.add('pulse');
    });
    overlay.addEventListener('webkitAnimationEnd', function(e) {
      e.target.classList.remove('pulse');
    });
  }

  return {
    globalInitialization: globalInitialization,
    setupOverlay: setupOverlay,
  };
});
