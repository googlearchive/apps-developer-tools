// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

cr.define('lintOverlay', function() {
  // List of permissions the user's item requested.
  var requestedPermissions = null;

  // Dictionary of permissions that were observed by monitoring the extension.
  var exercisedPermissions = null;

  // Dictionary for keeping track of which questions are displayed.
  var displayedQuestions = null;

  // Dictionary of permission: whether we manage that permission.
  var managedPermissions

  // Id of the item that's being lint-ed.
  var lintedId = null;

  // Configuration of monitoring permissions.
  var permissionCfg = [
    // Standard permissions. Detected by use of their api: chrome.<api_name>.*
    {name: 'alarms', onActivity: detectPermissionStandard},
    {name: 'bookmarks', onActivity: detectPermissionStandard},
    {name: 'browsingData', onActivity: detectPermissionStandard},
    {name: 'contentSettings', onActivity: detectPermissionStandard},
    {name: 'contextMenus', onActivity: detectPermissionStandard},
    {name: 'debugger', onActivity: detectPermissionStandard},
    {name: 'downloads', onActivity: detectPermissionStandard},
    {name: 'fileBrowserHandler', onActivity: detectPermissionStandard},
    {name: 'fontSettings', onActivity: detectPermissionStandard},
    {name: 'history', onActivity: detectPermissionStandard},
    {name: 'identity', onActivity: detectPermissionStandard},
    {name: 'idle', onActivity: detectPermissionStandard},
    {name: 'notifications', onActivity: detectPermissionStandard},
    {name: 'pageCapture', onActivity: detectPermissionStandard},
    {name: 'power', onActivity: detectPermissionStandard},
    {name: 'privacy', onActivity: detectPermissionStandard},
    {name: 'proxy', onActivity: detectPermissionStandard},
    {name: 'pushMessaging', onActivity: detectPermissionStandard},
    {name: 'system.display', onActivity: detectPermissionStandard},
    {name: 'system.storage', onActivity: detectPermissionStandard},
    {name: 'tabCapture', onActivity: detectPermissionStandard},
    {name: 'topSites', onActivity: detectPermissionStandard},
    {name: 'tts', onActivity: detectPermissionStandard},
    {name: 'ttsEngine', onActivity: detectPermissionStandard},
    {name: 'webNavigation', onActivity: detectPermissionStandard},
    {name: 'webRequest', onActivity: detectPermissionStandard},

    // Special permissions. Detection varies and is implemented in special
    // functions.
    {
      // Only certain calls are guarded by the management permission.
      name: 'management',
      onActivity: detectPermissionManagement
    },
    {
      // Need to check if webRequest API was called with an argument 'blockign'.
      name: 'webRequestBlocking',
      onActivity: detectPermissionWebRequestBlocking
    },
    {
      // Tabs API is very complicated - need to ask the user and cherry-pick the
      // functions that are called.
      name: 'tabs',
      onActivity: detectPermissionTabs,
      onQuestionAnswered: qaTabs,
      triggersQuestion: 'tabs'
    },
    {
      // Need to ask the user because we can't detect document.execCommand(...).
      name: 'clipboardRead',
      onManifest: manifestPermissionClipboard,
      onQuestionAnswered: qaClipboard,
      triggersQuestion: 'clipboard'
    },
    {
      // Need to ask the user because we can't detect document.execCommand(...).
      name: 'clipboardWrite',
      onManifest: manifestPermissionClipboard,
      onQuestionAnswered: qaClipboard,
      triggersQuestion: 'clipboard'
    },
    {
      // Need to verify that the developer insists on getting the user's
      // location without prompt.
      name: 'geolocation',
      onManifest: manifestPermissionGeolocation,
      onQuestionAnswered: qaGeolocation,
      triggersQuestion: 'geolocation'
    },
    {
      // Need to verify that the developer uses localStorage and needs more than
      // 5MB.
      name: 'unlimitedStorage',
      onManifest: manifestPermissionUnlimitedStorage,
      onQuestionAnswered: qaUnlimitedStorage,
      triggersQuestion: 'unlimitedStorage'
    },
    {
      // Ask the developer whether he really intends to keep Chrome up all the
      // time.
      name: 'background',
      onManifest: manifestPermissionBackground,
      onQuestionAnswered: qaBackground,
      triggersQuestion: 'background'
    },
    {
      // Meta permission for triggering code that detects host permissions and
      // content security policy.
      name: '<host permissions and CSP>',
      onManifest: manifestHostAndCSP,
      onNetworkEvent: networkEventHostAndCSP,
      onActivity: activityHostAndCSP
    }
  ];

  /**
    * Build an object that says whether we take notice of a particular
    * permission or not.
    * @param {!Object} lst List of permission objects.
    * @private
    */
  function buildManagedPermissions(lst) {
    var res = {};
    lst.forEach(function(permCfg) {
      res[permCfg.name] = true;
    });
    return res;
  }

  /**
   * Figure out whether particular activity implies us of particular permission.
   * @param {!Object} activity Activity from activityLogPrivate API
   * @param {!string} perm Name of the permission under consideration
   */
  function detectPermissionStandard(activity, perm) {
    if(activity.activityType === "api_call") {
      var regexp = new RegExp("^" + perm);
      if(regexp.exec(activity.apiCall) !== null) {
        return true;
      }
    }
    return false;
  }

  /**
   * Figure out whether the management permission is implied by the given
   * activity.
   * @param {!Object} activity Activity from activityLogPrivate API
   */
  function detectPermissionManagement(activity) {
    if(activity.activityType === "api_call") {
      var regexp = new RegExp("^management");
      if(regexp.exec(activity.apiCall) !== null) {
        if(apiCall.indexOf("getPermissionWarningByManifest") !== 0 &&
            apiCall.indexOf("uninstallSelf") !== 0) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Figure out whether the webRequestBlocking permission is implied by the
   * given activity.
   * @param {!Object} activity Activity from activityLogPrivate API
   */
  function detectPermissionWebRequestBlocking(activity) {
    if(activity.activityType === "api_call") {
      var apiCall = activity.apiCall;
      if(apiCall === "webRequestInternal.addEventListener") {
        var args = JSON.parse(activity.args);
        var arg2 = args[2];
        if(arg2 instanceof Array) {
          for(var i in arg2) {
            if(arg2[i] === "blocking")
              return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Helper function that displays given question if the extension asked for
   * the given permission.
   * @param {!Object} item ItemInfo from chrome.management.get API
   * @param {!string} param Name of the permission to check
   * @param {!string} question ID of the question to show
   */
  function manifestPermissionGeneric(item, perm, question) {
    if(item.permissions.indexOf(perm) !== -1) {
      showQuestion(question);
    }
  }

  /**
   * Process item's info from the perspective of geolocation permission.
   * @param {!Object} item ItemInfo from chrome.management.get API
   */
  function manifestPermissionGeolocation(item) {
    // If the developer asked for geolocation permission, display a question.
    manifestPermissionGeneric(item, 'geolocation', 'geolocation');
  }

  /**
   * Process item's info from the perspective of host permission and CSP.
   * @param {!Object} item ItemInfo from chrome.management.get API
   */
  function manifestHostAndCSP(item) {
    // Should process item.hostPermissions here.
    return false;
  }

  /**
   * Process item's info from the perspective of clipboard* permissions.
   * @param {!Object} item ItemInfo from chrome.management.get API
   */
  function manifestPermissionClipboard(item) {
    // If the developer asked for clipboard permission, display a question.
    manifestPermissionGeneric(item, 'clipboardRead', 'clipboard');
    manifestPermissionGeneric(item, 'clipboardWrite', 'clipboard');
  }

  /**
   * Process item's info from the perspective of unlimitedStorage permission.
   * @param {!Object} item ItemInfo from chrome.management.get API
   */
  function manifestPermissionUnlimitedStorage(item) {
    // If the developer asked for unlimitedStorage permission, display
    // a question.
    manifestPermissionGeneric(item, 'geolocation', 'geolocation');
  }

  /**
   * Process item's info from the perspective of background permission.
   * @param {!Object} item ItemInfo from chrome.management.get API
   */
  function manifestPermissionBackground(item) {
    // If the developer asked for background permission, display a question.
    manifestPermissionGeneric(item, 'background', 'background');
  }

  /**
   * Process answer to a question from the perspective of geolocation perm.
   * @param {!string} questionId Identifier of the question.
   * @param {!string} answer User's answer.
   */
  function qaGeolocation(questionId, answer) {
    if(questionId === 'geolocation') {
      if(answer === 'yes') {
        onPermissionDetected('geolocation');
      }
    }
  }

  /**
   * Process answer to a question from the perspective of clipboard* perms.
   * @param {!string} questionId Identifier of the question.
   * @param {!string} answer User's answer.
   */
  function qaClipboard(questionId, answer) {
    if(questionId === 'clipboard') {
      if(answer === 'copy') {
        onPermissionDetected('clipboardWrite');
      }
      else if(answer === 'paste') {
        onPermissionDetected('clipboardRead');
      }
      else if(answer === 'copypaste') {
        onPermissionDetected('clipboardWrite');
        onPermissionDetected('clipboardRead');
      }
    }
  }

  /**
   * Process answer to a question from the perspective of unlimitedStorage perm.
   * @param {!string} questionId Identifier of the question.
   * @param {!string} answer User's answer.
   */
  function qaUnlimitedStorage(questionId, answer) {
    if(questionId === 'unlimitedStorage') {
      if(answer === 'yes') {
        onPermissionDetected('unlimitedStorage');
      }
    }
  }

  /**
   * Process answer to a question from the perspective of tabs perm.
   * @param {!string} questionId Identifier of the question.
   * @param {!string} answer User's answer.
   */
  function qaTabs(questionId, answer) {
    if(questionId === 'tabs') {
      if(answer === 'yes') {
        onPermissionDetected('tabs');
      }
    }
  }

  /**
   * Process answer to a question from the perspective of background perm.
   * @param {!string} questionId Identifier of the question.
   * @param {!string} answer User's answer.
   */
  function qaBackground(questionId, answer) {
    if(questionId === 'background') {
      if(answer === 'yes') {
        onPermissionDetected('background');
      }
    }
  }


  /**
   * Figure out whether the tabs permission is implied by the given activity.
   * @param {!Object} activity Activity from activityLogPrivate API
   */
  function detectPermissionTabs(activity) {
    if(activity.activityType === "api_call") {
      var regexp = new RegExp("^tabs");
      if(regexp.exec(activity.apiCall) !== null) {
        var apiCall = activity.apiCall;
        if(apiCall.indexOf("query") !== -1 ||
            apiCall.indexOf("executeScript") !== -1 ||
            apiCall.indexOf("get") !== -1 ||
            apiCall.indexOf("getCurrent") !== -1 ||
            apiCall.indexOf("duplicate") !== -1 ||
            apiCall.indexOf("update") !== -1 ||
            apiCall.indexOf("move") !== -1 ||
            apiCall.indexOf("onCreated") !== -1 ||
            apiCall.indexOf("onUpdated") !== -1 ||
            apiCall.indexOf("executeScript") !== -1) {
          if(requestedPermissions.indexOf("tabs") !== -1)
            showQuestion("tabs");
          return false;
        }
      }
    }
    return false;
  }

  /**
   * Get url from the given activity.
   * @param {!Object} activity Activity from activityLogPrivate API
   */
  function getActivityArgUrl(activity, ndx) {
    var args = JSON.parse(activity.args);
    var url = args[ndx];
    if(url === "<arg_url>") {
      url = activity.argUrl;
    }
    return url;
  }

  /**
   * Process the activity from the standpoint of host permissions and CSP.
   * @param {!Object} activity Activity from activityLogPrivate API
   */
  function activityHostAndCSP(activity) {
    if(activity.activityType === "dom_access") {
      if(activity.apiCall === "XMLHttpRequest.open") {
        var url = getActivityArgUrl(activity, 1);
        onWebResourceDetected(url, "XHR");
      }
    }
    return false;
  }

  /**
   * Process network event from chrome.debugger API from the standpoint of
   * host permissions and CSP.
   */
  function networkEventHostAndCSP(req) {
    onWebResourceDetected(req.url, req.type);
    return false;
  }

  /**
   * Display question for user.
   * @param {!string} questionId Question identifier in the HTML template.
   */
  function showQuestion(questionId) {
    displayedQuestions[questionId] = true;

    // Locate the question element.
    var questions = $('lintQuestions').children;
    for(var i = 0; i < questions.length; i++) {
      var question = questions[i];
      if(question.getAttribute('question-id') === questionId) {
        // When located, unhide it and assign proper actions for click.
        question.hidden = false;
        var answers = question.querySelectorAll('[type="button"]');
        for(var y = 0; y < answers.length; y++) {
          var answer = answers[y];
          answer.onclick = onQuestionAnswered.bind(
              null, questionId, answer.getAttribute('q-answer'));
        }
      }
    }

    // Display label if it wasn't displayed before.
    updateQuestionLabel();
  }

  /**
   * Hide question.
   * @param {!string} questionId Question identifier in the HTML template.
   */
  function hideQuestion(questionId) {
    displayedQuestions[questionId] = false;

    // Locate the question element.
    var questions = $('lintQuestions').children;
    for(var i = 0; i < questions.length; i++) {
      var question = questions[i];
      if(question.getAttribute('question-id') === questionId) {
        // When located, hide it.
        question.hidden = true;
      }
    }

    // Hide label if this is the last displayed question.
    updateQuestionLabel();
  }

  /**
   * Hide question label if no questions are displayed.
   * @param {!string} questionId Question identifier in the HTML template.
   */
  function updateQuestionLabel() {
    var label = $('lintQuestionsLabel');
    for(var qId in displayedQuestions) {
      if(displayedQuestions[qId] === true) {
        label.hidden = false;
        return;
      }
    }
    label.hidden = true;
  }

  /**
   * Hide all questions.
   */
  function hideAllQuestions() {
    var questions = $('lintQuestions').children;
    for(var i = 0; i < questions.length; i++) {
      var question = questions[i];
      question.hidden = true;
    }
    updateQuestionLabel();
  }

  /**
   * Handle chrome.activityLoggingPrivate.onExtensionActivity event by invoking
   * corresponding handlers of each configured permission.
   * @param {!object} activity chrome.activityLoggingPrivate API activity object
   */
  function onExtensionActivity(activity) {
    if(activity.extensionId === lintedId) {
      permissionCfg.forEach(function(permCfg, i) {
        if(permCfg.onActivity && permCfg.onActivity(activity, permCfg.name)) {
          onPermissionDetected(permCfg.name);
        }
      });
    }
  }

  /**
   * Handle chrome.debugger.onEvent event by invoking the corresponding handlers
   * of each configured permission.
   * @param {!object} chrome.debugger.onEvent API event object
   */
  function onNetworkEvent(tab, message, params) {
    if(message === "Network.responseReceived") {
      if(params.type !== "XHR") {  // XHRs are captured in onActivity
        var req = {
          url: params.response.url,
          type: params.type
        };
        permissionCfg.forEach(function(permCfg, i) {
          if(permCfg.onNetworkEvent &&
              permCfg.onNetworkEvent(req, permCfg.name)) {
            onPermissionDetected(permCfg.name);
          }
        });
      }
    }
  }

  /**
   * Handle when the user answers an question by inovking corresponding handlers
   * of each configured permission.
   * @param {!string} questionId Identiifier of the question.
   * @param {!string} answer User's answer to the question.
   */
  function onQuestionAnswered(questionId, answer) {
    permissionCfg.forEach(function(permCfg, i) {
      if(permCfg.onQuestionAnswered && permCfg.onQuestionAnswered(questionId, answer, permCfg.name)) {
        onPermissionDetected(permCfg.name);
      }
    });

    hideQuestion(questionId);
  }

  /**
   * Get host location from the given url.
   * @param {!string} href URL
   */
  function getLocation(href) {
      var l = document.createElement("a");
      l.href = href;
      return l;
  }

  /**
   * Extract CSP location string from the url.
   * @param {!string} url URL
   */
  function extractCSPHost(url) {
    var loc = getLocation(url);
    var host = loc.protocol + '//' + loc.hostname;
    return host;
  }

  /**
   * Extract host permission from given URL.
   * @param {!string} url URL
   */
  function extractPermHost(url) {
    return extractCSPHost(url) + "/*";
  }

  /**
   * Handle the event of detecting a web resource.
   * @param {!string} url URL of the resource
   * @param {!string} type Type of the resource
   */
  function onWebResourceDetected(url, type) {
    if(type === "XHR") {
      var hostPerm = extractPermHost(url);
      if(hostPerm.indexOf("chrome-extension://") !== 0)
        onHostPermissionDetected(hostPerm);

      var hostCSP = extractCSPHost(url);
      if(hostCSP.indexOf("chrome-extension://") !== 0)
        onCSPDetected(hostCSP, "connect");
      else
        onCSPDetected("self", "connect");
    } else {
      var hostCSP = extractCSPHost(url);
      if(hostCSP.indexOf("chrome-extension://") !== 0)
        onCSPDetected(hostCSP, "default");
      else
        onCSPDetected("self", "default");
    }
  }

  /**
   * Handle the event of detecting a permission.
   * @param {!string} permName Name of the permission that's been detected.
   */
  function onPermissionDetected(permName) {
    console.debug("permission detected: " + permName);
    exercisedPermissions[permName] = true;

    displayResults();
  }

  /**
   * Handle the event of detecting a host permission.
   * @param {!string} permName Name of the permission that's been detected.
   */
  function onHostPermissionDetected(permName) {
    exercisedHostPermissions[permName] = true;

    displayResults();
  }

  /**
   * Handle the event of detecting a CSP.
   * @param {!string} permName Name of the permission that's been detected.
   */
  function onCSPDetected(host, type) {
    exercisedCSP[type][host] = true;

    displayResults();
  }

  /**
   * Delete all children of the element.
   * @param {!Object} node Element.
   */
  function clearElement(node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
  }

  /**
   * Render results.
   */
  function displayResults() {
    // Assemble list of redundant permissions.
    var redundantList = document.createElement('ul');
    requestedPermissions.forEach(function(perm) {
      if(exercisedPermissions[perm] === undefined &&
          managedPermissions[perm] === true) {
        var li = document.createElement('li');
        li.textContent = perm;
        redundantList.appendChild(li);
      }
    });

    var redundantPermNode = $('lintRedundantPermissions')
    clearElement(redundantPermNode);
    redundantPermNode.appendChild(redundantList);

    // Assemble CSP suggestion.
    var cspSuggestionNode = $('lintCSPSuggestion');
    var cspStr = "  'content_security_policy': ";
    for(var cspType in exercisedCSP) {
      cspStr += cspType + "-src ";
      for(var cspHost in exercisedCSP[cspType]) {
        cspStr += cspHost + " ";
      }
      cspStr += "; ";
    }
    cspSuggestionNode.innerText = cspStr;


    // Assemble list of used permissions.
    var usedList = document.createElement('ul');
    for(var perm in exercisedPermissions) {
      var li = document.createElement('li');
      li.textContent = perm;
      usedList.appendChild(li);
    }


    var usedPermNode = $('lintUsedPermissions')
    clearElement(usedPermNode);
    usedPermNode.appendChild(usedList);
  }

  /**
   * Initialize the linter.
   */
  function initialize() {
    managedPermissions = buildManagedPermissions(permissionCfg);

    $('lintQuestionsLabel').onclick = function() {
      $('lintQuestions').hidden = ! $('lintQuestions').hidden;
    };
  };

  /**
   * Handle the onAttach event.
   * @param{!int} tabId ID of the tab to attach debugger to
   */
  function onAttach(tabId) {
    if (chrome.runtime.lastError) {
      console.debug(chrome.runtime.lastError.message);
      return;
    }

    chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
    console.debug("attached " + tabId);
  }

  /**
   * Handle the onAttach event.
   * @param{!int} eId ID of the extension to attach debugger to
   */
  function onAttachExtension(eId) {
    if (chrome.runtime.lastError) {
      var msg = chrome.runtime.lastError.message;
      if(msg.indexOf("silent-debugger-extension-api") !== -1) {
        $("#error").html("Please go to chrome://flags and enable silent-debugger-extension-api. Then restart your browser and try again.").show();
      }
      console.debug(msg);
      return;
    }

    var debugeeId = {extensionId: eId};
    chrome.debugger.sendCommand(debugeeId, "Network.enable", function() {
      if(chrome.runtime.lastError)
        console.debug("Failed enabling network for extension: " + chrome.runtime.lastError.message);
      else
        console.debug("dbugger nbled");
    });
  }

  /**
   * Attach the debugger to given tab.
   * @param{!int} tabId ID of the tab to attach debugger to.
   */
  function attachDebugger(tab) {
    console.debug("attaching");
    chrome.debugger.attach({tabId:tab.id}, "1.0",
          onAttach.bind(null, tab.id));
  }

  /**
   * Attach the debugger to the given extension background page.
   * @param{!string} eId ID of the extension to attach to
   */
  function attachDebuggerToExtension(eid) {
    chrome.debugger.attach({extensionId: eid}, "1.0",
          onAttachExtension.bind(null, eid));
  }

  /**
   * Get extension's url.
   * @param{!string} eId extension's id
   */
  function getExtensionUrl(eId) {
    return "chrome-extension://" + eId + "/";
  }

  /**
   * Starts security lint-ing the item
   * @param {string} itemId Id of the Chrome item (app/extension).
   * @doneCallback {function} doneCallback Function called when linting started.
   */
  function start(itemId, doneCallback) {
    lintedId = itemId;
    exercisedPermissions = {};
    exercisedHostPermissions = {};
    requestedPermissions = [];
    requestedHostPermissions = [];
    attachedTo = [];
    exercisedCSP = {
      connect: {},
      default: {}
    };
    displayedQuestions = {};

    // Get information about the lint-ed item.
    chrome.management.get(itemId, function(item) {
      requestedPermissions = item.permissions;
      requestedHostPermissions = item.hostPermissions;

      // Trigger onManifest events of each configured permission.
      permissionCfg.forEach(function(permCfg, i) {
        if(permCfg.onManifest && permCfg.onManifest(item)) {
          onPermissionDetected(permCfg.name);
        }
      });

      // Refresh view.
      displayResults();
    });

    // Start logging the activity of extenisons.
    chrome.activityLogPrivate.onExtensionActivity.addListener(
        onExtensionActivity);

    hideAllQuestions();

    // Attach debugger to the extension's background page.
    chrome.debugger.onEvent.addListener(onNetworkEvent);

    // If a new tab is created belonging to the extension, attach debugger.
    chrome.tabs.onCreated.addListener(function(tab) {
      if(tab.url.indexOf(getExtensionUrl(itemId)) === 0) {
        attachDebugger(tab);
        attachedTo.push(tab.id);
      }
    });

    // Reload the extension (disable -> enable).
    chrome.management.setEnabled(itemId, false, function() {
      chrome.management.setEnabled(itemId, true, function() {
        attachDebuggerToExtension(itemId);
        doneCallback();
      });
    });

  };

  /**
   * Ends security lint-ing the item.
   * @param {function} callback Function called when lining stopped.
   */
  function stop(callback) {
    chrome.debugger.detach({extensionId: itemId});
    for(var i in attachedTo) {
      chrome.debugger.detach({tabId: attachedTo[i]});
    }

    chrome.activityLogPrivate.onExtensionActivity.removeListener(
        onExtensionActivity);
    callback();
  }

  // Export
  return {
    initialize: initialize,
    start: start,
    stop: stop
  };
});

document.addEventListener('DOMContentLoaded', lintOverlay.initialize);
