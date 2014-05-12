goog.provide('watchdog.Activity');

/**
 * @constructor Constructor for watchdog.Activity class.
 * @param {!ExtensionActivity} activity Extension activity object.
 */
watchdog.Activity = function(activity) {
  /**
   * ExtensionActivity object, encapsulates logic for an activity.
   * @private {!ExtensionActivity}
   */
  this.activity_ = activity;
};

/**
 * List of activity types that can be looked up from the watchdog extension.
 * The property names correspond to the enum in ExtensionActivity.ActivityType
 * and the values are the text that should appear on the UI.
 * @type {!Object.<string, string>}
 */
watchdog.Activity.activityTypes = {
  'any': 'Any',
  'api_call': 'API call',
  'api_event': 'API event',
  'content_script': 'Content script',
  'dom_access': 'DOM access',
  'dom_event': 'DOM event',
  'web_request': 'Web request'
};

/**
 * DOM API methods that should be treated like setters.
 * @private {!Array.<string>}
 * @const
 */
watchdog.Activity.DOM_API_METHODS_SETTERS_ = [
  'Document.write',
  'Node.appendChild',
  'Node.insertBefore',
  'Node.replaceChild'
];

/**
 * DOM APIs that should be displayed in the notable activity section.
 * @private {!Array.<string>}
 * @const
 */
watchdog.Activity.NOTABLE_DOM_API_METHODS_ = [
  'Element.webkitRequestFullScreen',
  'Geolocation.getCurrentPosition',
  'Geolocation.watchPosition',
  'HTMLVideoElement.webkitEnterFullScreen'
];

/**
 * Chrome APIs that should be displayed in the notable activity section.
 * @private {!Array.<string>}
 * @const
 */
watchdog.Activity.NOTABLE_CHROME_API_METHODS_ = [
  'bluetooth.connect',
  'bluetooth.disconnect',
  'bluetooth.read',
  'bluetooth.startDiscovery',
  'bluetooth.stopDiscovery',
  'bluetooth.write',
  'bookmarks.create',
  'bookmarks.get',
  'bookmarks.getChildren',
  'bookmarks.getRecent',
  'bookmarks.getSubTree',
  'bookmarks.getTree',
  'bookmarks.move',
  'bookmarks.remove',
  'bookmarks.removeTree',
  'bookmarks.search',
  'bookmarks.update',
  'browsingData.remove',
  'browsingData.removeAppCache',
  'browsingData.removeCache',
  'browsingData.removeCookies',
  'browsingData.removeDownloads',
  'browsingData.removeFileSystems',
  'browsingData.removeFormData',
  'browsingData.removeHistory',
  'browsingData.removeIndexedDB',
  'browsingData.removeLocalStorage',
  'browsingData.removePasswords',
  'browsingData.removePluginData',
  'browsingData.removeWebSQL',
  'cookies.get',
  'cookies.getAll',
  'cookies.getAllCookieStores',
  'cookies.remove',
  'cookies.set',
  'downloads.acceptDanger',
  'downloads.cancel',
  'downloads.download',
  'downloads.erase',
  'history.addUrl',
  'history.deleteAll',
  'history.deleteRange',
  'history.deleteUrl',
  'history.getVisits',
  'history.search',
  'location.clearWatch',
  'location.watchLocation',
  'management.get',
  'management.getAll',
  'management.setEnabled',
  'management.uninstall',
  'notifications.create',
  'permissions.request',
  'power.requestKeepAwake',
  'processes.terminate',
  'serial.open',
  'serial.read',
  'serial.write',
  'sessions.getDevices',
  'sessions.getRecentlyClosed',
  'sessions.restore',
  'signedInDevices.get',
  'socket.accept',
  'socket.bind',
  'socket.connect',
  'socket.create',
  'socket.disconnect',
  'socket.read',
  'socket.recvFrom',
  'socket.sendTo',
  'socket.write',
  'tabCapture.capture',
  'tabCapture.getCapturedTabs',
  'tabs.create',
  'tabs.executeScript',
  'tabs.get',
  'tabs.getCurrent',
  'tabs.insertCSS',
  'tabs.move',
  'tabs.query',
  'tabs.reload',
  'tabs.remove',
  'tabs.update',
  'topSites.get'
];

/**
 * Chrome APIs that are unimportant and should be hidden in the summary page.
 * @private {!Array.<string>}
 * @const
 */
watchdog.Activity.UNIMPORTANT_CHROME_API_METHODS_ = [
  // These events also generate a separate web_request action summarizing the
  // effects, and so don't need to be displayed.
  'webRequest.onAuthRequired',
  'webRequest.onBeforeRedirect',
  'webRequest.onBeforeRequest',
  'webRequest.onBeforeSendHeaders',
  'webRequest.onCompleted',
  'webRequest.onErrorOccurred',
  'webRequest.onHeadersReceived',
  'webRequest.onResponseStarted',
  'webRequest.onSendHeaders',
  'webRequestInternal.eventHandled'
];

/**
 * Gets the extension id.
 * @return {string} Extension id associated with the activity.
 */
watchdog.Activity.prototype.getExtensionId = function() {
  return this.activity_.extensionId || 'unknown id';
};

/**
 * Gets a nicely formatted time string.
 * @return {string} Time to display to user.
 */
watchdog.Activity.prototype.getTime = function() {
  if (!this.activity_.time) {
    return '';
  }

  var date = new Date(this.activity_.time);
  return date.toLocaleTimeString();
};

/**
 * Gets a nicely formatted date and time string.
 * @return {string} Date and time to display to user.
 */
watchdog.Activity.prototype.getDateAndTime = function() {
  if (!this.activity_.time) {
    return '';
  }

  var date = new Date(this.activity_.time);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};

/**
 * Gets the activity count value.
 * @return {number} Count value or 0 if undefined.
 */
watchdog.Activity.prototype.getCount = function() {
  return this.activity_.count || 0;
};

/**
 * Increments the activity count. Used when multiple activities are being
 * aggregated into a single watchdog activity for the history view.
 * @param {number} incrementBy Amount to increment the count by.
 */
watchdog.Activity.prototype.incrementCount = function(incrementBy) {
  if (!this.activity_.count) {
    this.activity_.count = incrementBy;
  } else {
    this.activity_.count += incrementBy;
  }
};

/**
 * Gets the api call.
 * @return {string} Api call or empty string.
 */
watchdog.Activity.prototype.getApiCall = function() {
  return this.activity_.apiCall || '';
};

/**
 * Gets the page url for the activity.
 * @return {string} Page url or empty string.
 */
watchdog.Activity.prototype.getPageUrl = function() {
  return this.activity_.pageUrl || '';
};

/**
 * Gets the arg url for the activity.
 * @return {string} Arg url or empty string.
 */
watchdog.Activity.prototype.getArgUrl = function() {
  return this.activity_.argUrl || '';
};

/**
 * Gets a list of arguments.
 * @return {Array} Args or empty array.
 */
watchdog.Activity.prototype.getArgs = function() {
  // Returns the specified value with all instances of "<arg_url>" substituted.
  // May modify the input value. Recursively processes both arrays and objects.
  var replaceArgUrl = function(value, replacement) {
    if (value === '<arg_url>') {
      value = replacement;
    } else if (value instanceof Array) {
      for (var i = 0; i < value.length; i++) {
        value[i] = replaceArgUrl(value[i], replacement);
      }
    } else if (typeof value == 'object') {
      for (var property in value) {
        if (value.hasOwnProperty(property)) {
          value[property] = replaceArgUrl(value[property], replacement);
        }
      }
    }
    return value;
  };

  var args = [];
  if (this.activity_.args) {
    try {
      args = JSON.parse(this.activity_.args);
    } catch (error) {
      // Pass through: JSON parsing errors will leave args as [].
    }

    var arg_url = this.getArgUrl();
    if (arg_url)
      args = replaceArgUrl(args, arg_url);

    if (!(args instanceof Array))
      args = [];
  }
  return args;
};

/**
 * Gets information about modifications made via the WebRequest API.
 * @return {Object} Information about modifications made via WebRequest (an
 *     object with one property per type of modification), or null if this is
 *     not a WebRequest action.
 */
watchdog.Activity.prototype.getWebRequest = function() {
  try {
    var details = JSON.parse(this.activity_.other.webRequest);
    return /** @type {Object} */ (details);
  } catch (error) {
    return null;
  }
};

/**
 * Gets a user friendly string to describe the type of activity.
 * @return {string} Description of activity.
 */
watchdog.Activity.prototype.getActionString = function() {
  var messageName = this.activity_.apiCall.replace('.', '_');
  if (this.activity_.activityType.substring(0, 3) == 'dom') {
    messageName = 'dom_' + messageName;
  } else if (this.activity_.activityType.substring(0, 3) == 'api') {
    messageName = 'chrome_' + messageName;
  } else if (this.activity_.activityType == 'content_script') {
    messageName = 'contentScript';
  } else if (this.activity_.activityType == 'web_request') {
    messageName = 'chrome_' + messageName;
  }

  var actionString = chrome.i18n.getMessage(messageName);
  // If no translation was defined fall back to the "invoked <api_call>"
  // or "notified of <event>" template.
  if (!actionString) {
    if (this.activity_.activityType.substring(0, 3) == 'dom' &&
        this.activity_.other && this.activity_.other.domVerb == 'setter') {
      actionString = chrome.i18n.getMessage('genericModified');
    } else {
      var template =
          this.activity_.activityType == 'api_event' ?
          'eventTemplate' : 'invokedTemplate';
      actionString = chrome.i18n.getMessage(template, [this.activity_.apiCall]);
    }
  }

  return actionString;
};

/**
 * Gets a user-friendly list of string to describe this webRequest action.
 * @return {!Array.<string>} Descriptions of activities.  Always contains at
 *     least one element for valid webrequest actions, but is empty for
 *     non-webrequest actions.
 */
watchdog.Activity.prototype.getWebRequestStrings = function() {
  var web_request = this.getWebRequest();
  if (this.activity_.activityType != 'web_request' || web_request == null)
    return [];

  var actions = [];
  for (var key in web_request) {
    var description = chrome.i18n.getMessage('webrequest_' + key);
    if (!description)
      description = key;
    actions.push(description);
  }
  if (actions.length == 0) {
    actions.push(chrome.i18n.getMessage('webrequest_none'));
  }

  return actions;
};

/**
 * Returns an access type (getter/setter/method) of an activity.
 * @return {string} Access type (getter/setter/method) of an activity if
 *    applicable.
 */
watchdog.Activity.prototype.getAccessType = function() {
  if (this.activity_.other && this.activity_.other.domVerb) {
    return this.activity_.other.domVerb;
  }
  return '';
};

/**
 * Returns type of an activity.
 * @return {string} Type of an activity.
 */
watchdog.Activity.prototype.getActivityType = function() {
  return this.activity_.activityType || '';
};

/**
 * Gets a description the type of activity suitable for developer mode.
 * @return {string} Description of activity.
 */
watchdog.Activity.prototype.getDevModeActionString = function() {
  if (this.activity_.activityType.substring(0, 3) == 'dom' &&
      this.activity_.other) {
    var domVerb = this.activity_.other.domVerb;
    if (domVerb == 'setter') {
      return chrome.i18n.getMessage(
          'modifiedTemplate', [this.activity_.apiCall]);
    } else if (domVerb == 'getter') {
      return chrome.i18n.getMessage(
          'accessedTemplate', [this.activity_.apiCall]);
    }
  } else if (this.activity_.activityType == 'content_script') {
      return chrome.i18n.getMessage('contentScript');
  } else if (this.activity_.activityType == 'web_request') {
    return chrome.i18n.getMessage(
        'webRequestTemplate', [this.activity_.apiCall]);
  } else if (this.activity_.activityType == 'api_event') {
    return chrome.i18n.getMessage(
        'eventTemplate', [this.activity_.apiCall]);
  }
  return chrome.i18n.getMessage(
      'invokedTemplate', [this.activity_.apiCall]);
};

/**
 * Decides if the activity is notable (security relevant).
 *
 * @return {boolean} True if activity is notable, false otherwise.
 */
watchdog.Activity.prototype.isNotable = function() {
  // Some DOM methods and all DOM setters.
  if (this.activity_.activityType.substring(0, 3) == 'dom' &&
      this.activity_.other) {
    if (this.activity_.other.domVerb == 'setter') {
      return true;
    } else if (this.activity_.other.domVerb == 'method' &&
               watchdog.Activity.NOTABLE_DOM_API_METHODS_.indexOf(
                   this.activity_.apiCall) >= 0) {
      return true;
    } else if (this.activity_.other.domVerb == 'method' &&
               watchdog.Activity.DOM_API_METHODS_SETTERS_.indexOf(
                   this.activity_.apiCall) >= 0) {
      return true;
    }
  }

  // Most instrusive Chrome apis.
  if (this.activity_.activityType.substring(0, 3) == 'api' &&
      watchdog.Activity.NOTABLE_CHROME_API_METHODS_.indexOf(
          this.activity_.apiCall) >= 0) {
    return true;
  }

  // All webrequests.
  // TODO(felt): Reconsider how this should be grouped/categorized.
  if (this.activity_.activityType == 'web_request') {
    return true;
  }

  return false;
};

/**
 * Decides if the activity is unimportant (should be hidden in the summary
 * view).
 *
 * @return {boolean} True if activity should be hidden, false otherwise.
 */
watchdog.Activity.prototype.isUnimportant = function() {
  // WebRequest event names may have a suffix added, such as "/2".  Strip
  // this off for comparison purposes.
  var apiCall = this.activity_.apiCall.replace(/\/[0-9]+$/, '');

  if (this.activity_.activityType.substring(0, 3) == 'api' &&
      watchdog.Activity.UNIMPORTANT_CHROME_API_METHODS_.indexOf(apiCall) >= 0) {
    return true;
  }

  return false;
};

/**
 * Decides if the activity passes the filter.
 * @param {ActivityFilter} filter Filter to check the activity against.
 * @return {boolean} True if activity passes, false otherwise.
 */
watchdog.Activity.prototype.passesFilter = function(filter) {
  if (filter.activityType) {
    if (filter.activityType != 'any' &&
        filter.activityType != this.activity_.activityType) {
      return false;
    }
  }

  if (filter.apiCall) {
    if (filter.apiCall instanceof RegExp) {
      if (filter.apiCall.exec(this.activity_.apiCall) == null)
        return false;
    } else {
      if (filter.apiCall != this.activity_.apiCall)
        return false;
    }
  }

  if (filter.pageUrl) {
    if (filter.pageUrl instanceof RegExp) {
      if (filter.pageUrl.exec(this.activity_.pageUrl) == null)
        return false;
    } else {
      if (filter.pageUrl != this.activity_.pageUrl)
        return false;
    }
  }

  if (filter.argUrl) {
    if (filter.argUrl instanceof RegExp) {
      if (filter.argUrl.exec(this.activity_.argUrl) == null)
        return false;
    } else {
      if (filter.argUrl != this.activity_.argUrl)
        return false;
    }
  }

  if (filter.filterCallback) {
    if (!filter.filterCallback(this))
      return false;
  }

  return true;
};

/**
 * Returns a raw activity object which is the ExtensionActivity object.
 * @return {!ExtensionActivity} A raw activity object.
 */
watchdog.Activity.prototype.getRawActivity = function() {
  return this.activity_;
};

/**
 * Helper method that assists JSON.stringify in converting activity to JSON
 * string.
 * @return {!ExtensionActivity} Object that should be converted to JSON string.
 */
watchdog.Activity.prototype.toJSON = function() {
  return this.getRawActivity();
};

/**
 * Converts an activity to a string.
 * @return {string} Strung representation of an activity.
 */
watchdog.Activity.prototype.toString = function() {
  var ret = [];
  if (this.getDateAndTime())
    ret.push(this.getDateAndTime());
  ret.push(this.activity_.extensionId);
  if (this.activity_.activityType)
    ret.push(this.activity_.activityType);
  if (this.activity_.apiCall)
    ret.push(this.activity_.apiCall);
  if (this.activity_.args)
    ret.push(this.activity_.args);
  if (this.activity_.argUrl)
    ret.push(this.activity_.argUrl);
  if (this.activity_.pageUrl)
    ret.push(this.activity_.pageUrl);
  return ret.join(', ');
};
