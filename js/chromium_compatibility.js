// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains necessary substitutions for chrome tools which are not
// present in the Apps Developer Tools code. For instance, the loadTimeData
// module is used in the chromium .js files to get an internationalized string,
// but here we must use chrome.i18n.getMessage(). Use this as the preferred
// workaround to altering the chromium files, so that we can update the
// chromium resources via a simple copy and paste.

var loadTimeData = {'getString': function(id) {
  return chrome.i18n.getMessage(id);
}};
