cr.define('apps_dev_tool', function() {
  'use strict';

  /**
   * @constructor Constructor for the ActivityGroupList class. Encapsulates
   * activity data to show in the history view.
   */
  var ActivityGroupList = function() {
    /**
     * Map of detail strings to group objects.
     * @private {!Object.<string, ActivityGroup>}
     */
    this.activityGroups_ = {};
  };

  /**
   * Adds an activity. If the api call and page URL combination is already
   * present then the counts are aggregated.
   * @param {!ExtensionActivity} activity Activity to add.
   */
  ActivityGroupList.prototype.add = function(activity) {
    var act = new apps_dev_tool.Activity(activity);

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
            new apps_dev_tool.ActivityGroup(groupName);
      }
      this.activityGroups_[lookupName].add(act);
    }
  };

  /**
   * Gets the list of activities.
   * @return {!Array.<!apps_dev_tool.ActivityGroup>} list of activities.
   */
  ActivityGroupList.prototype.getActivityGroups = function() {
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
  ActivityGroupList.getFilteredExtensionActivities = function(
      filter, callback) {
    chrome.activityLogPrivate.getExtensionActivities(filter, function(result) {
      var activityList = new ActivityGroupList();
      result.activities.forEach(function(activity) {
        activityList.add(activity);
      });
      callback(activityList);
    });
  };

  // Export
  return {
    ActivityGroupList: ActivityGroupList
  };
});
