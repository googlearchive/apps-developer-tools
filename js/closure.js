// Copyright (c) 2013 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Closure should not call document.write('<script src=...') to load library
// dependencies, as that does not work for packaged apps.  We will manually
// load all our Closure dependencies in order.
var CLOSURE_NO_DEPS = true;
