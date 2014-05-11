goog.provide('watchdog.ActivityGroup');

goog.require('watchdog.Activity');

 /**
 * @constructor Construct for watchdog.ActivityGroup class. Encapsulates
 * activities that be grouped together.
 * @param {string} name Name for the group. Usually the string displayed on the
 * UI that describes the group.
 */
watchdog.ActivityGroup = function(name) {
  /**
   * Name for the group.
   * @private {string}
   */
  this.name_ = name;

  /**
   * (Optional) URL associated with the group.
   * @private {string}
   */
  this.url_ = '';

  /**
   * Stores the total count for this group.
   * @private {number}
   */
  this.totalCount_ = 0;

  /**
   * True if any of the activities are notable.
   * @private {boolean}
   */
  this.isNotable_ = false;


  /**
   * Map of api calls to counts.
   * @private {!Object.<string, number>}
   */
  this.activityCounts_ = {};
};

/**
 * Increases the value associated with key in the activity counts map.
 * @param {string} key Name for activity in the map.
 * @param {number} value Value to increase the activity count by.
 */
watchdog.ActivityGroup.prototype.updateActivityCounts = function(key, value) {
  if (!this.activityCounts_[key])
    this.activityCounts_[key] = 0;
  this.activityCounts_[key] += value;
};

/**
 * Adds the activity details to the group. If the activity does not contain an
 * api call the total count will be incremented but nothing will be added to the
 * activity counts map.
 * @param {watchdog.Activity} activity
 */
watchdog.ActivityGroup.prototype.add = function(activity) {
  this.totalCount_ += activity.getCount();

  if (activity.isNotable())
    this.isNotable_ = true;

  if (!this.url_ && activity.getPageUrl())
    this.url_ = activity.getPageUrl();

  var apiCall = activity.getApiCall();
  if (apiCall)
    this.updateActivityCounts(apiCall, activity.getCount());

  // Content scripts don't have an api call but they do have the list of script
  // names in the args. Add those to the counts instead.
  if (activity.getActivityType() == 'content_script') {
    goog.array.forEach(activity.getArgs(), function(arg) {
      this.updateActivityCounts(arg, activity.getCount());
    }, this);
  }
};

/**
 * Gets the name of the group.
 * @return {string}
 */
watchdog.ActivityGroup.prototype.getName = function() {
  return this.name_;
};

/**
 * Gets the total count for activities in the group.
 * @return {number}
 */
watchdog.ActivityGroup.prototype.getTotalCount = function() {
  return this.totalCount_;
};

/**
 * Gets whether there is at least one notable activity in the group.
 * @return {boolean}
 */
watchdog.ActivityGroup.prototype.isNotable = function() {
  return this.isNotable_;
};

/**
 * Gets the map of api call names to their counts.
 * @return {!Object.<string, number>}
 */
watchdog.ActivityGroup.prototype.getActivityCounts = function() {
  return this.activityCounts_;
};

/**
 * Gets the URL associated with this group.
 * @return {string}
 */
watchdog.ActivityGroup.prototype.getUrl = function() {
  return this.url_;
};
