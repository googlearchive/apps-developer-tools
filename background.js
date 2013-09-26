// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

chrome.app.runtime.onLaunched.addListener(function() {
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
  var width = 800;
  var height = 600;

  chrome.app.window.create('main.html', {
    id: 'apps_devtool',
    minHeight: 600,
    minWidth: 800,
    height: width,
    width: height,
    singleton: true,
    left: Math.floor((screenWidth - width) / 2),
    top : Math.floor((screenHeight - height) / 2)
});
