goog.provide('watchdog.ActivityGroupList');

goog.require('watchdog.Activity');
goog.require('watchdog.ActivityGroup');

/**
 * @constructor Construct for watchdog.ActivityGroupList class. Encapsulates
 * activity data to show in the history view.
 */
watchdog.ActivityGroupList = function() {
  /**
   * Map of detail strings to group objects.
   * @private {!Object.<string, watchdog.ActivityGroup>}
   */
  this.activityGroups_ = {};
};

/**
 * Adds an activity. If the api call and page URL combination is already
 * present then the counts are aggregated.
 * @param {!ExtensionActivity} activity Activity to add.
 */
watchdog.ActivityGroupList.prototype.add = function(activity) {
  var act = new watchdog.Activity(activity);

  // Don't display unimportant activities in the aggregated summary view.
  if (act.isUnimportant())
    return;

  var groupNames = [act.getActionString()];

  // WebRequest actions are special because they can have several sub-actions.
  // Split each WebRequest action apart here--a single action may show up
  // multiple times, but this should be a more clear way of presenting the
  // important information to the user.
  if (act.getActivityType() == 'web_request') {
    groupNames = act.getWebRequestStrings();
  }

  for (var i = 0; i < groupNames.length; i++) {
    var groupName = groupNames[i];
    var lookupName = groupName + '\n' + act.getPageUrl();

    if (!this.activityGroups_[lookupName]) {
      this.activityGroups_[lookupName] =
          new watchdog.ActivityGroup(groupName);
    }
    this.activityGroups_[lookupName].add(act);
  }
};

/**
 * Gets the list of watchdog activities.
 * @return {!Array.<!watchdog.ActivityGroup>} list of activities.
 */
watchdog.ActivityGroupList.prototype.getActivityGroups = function() {
  var activityGroups = [];
  for (var groupName in this.activityGroups_) {
    activityGroups.push(this.activityGroups_[groupName]);
  }

  // Sort the list by total count of the activity group with the highest count
  // first in the list.  If needed, break ties by group name.
  activityGroups.sort(function(a, b) {
    if (a.getTotalCount() != b.getTotalCount())
      return b.getTotalCount() - a.getTotalCount();
    if (a.getName() < b.getName())
      return -1;
    if (a.getName() > b.getName())
      return 1;
    return 0;
  });
  return activityGroups;
};

/**
 * Loads the activities for the extension.
 * @param {!ActivityFilter} filter Filter for the activity lookup.
 * @param {Function} callback The callback that receives the activities.
 */
watchdog.ActivityGroupList.getFilteredExtensionActivities = function(
    filter, callback) {
  chrome.activityLogPrivate.getExtensionActivities(filter, function(result) {
    var activityList = new watchdog.ActivityGroupList();
    goog.array.forEach(result.activities, function(activity) {
      activityList.add(activity);
    });
    callback(activityList);
  });
};
