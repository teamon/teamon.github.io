---
author: Tymon Tobolski
date: 2010-02-16
title: "Lift: “if(loggedIn)” in view"
tags: scala, lift
source: tumblr
source_url: http://tumblr.teamon.eu/post/392614495/lift-if-loggedin-in-view
---

Via: http://wiki.github.com/dpp/liftweb/logging-in-users-without-any-db (there is a bug)

View:

```html
<lift:test_cond.loggedin>
    ... logged in markup ...
</lift:test_cond.loggedin>

<lift:test_cond.loggedout>
    ... logged out markup ...
</lift:test_cond.loggedout>
```

```scala
// Boot.scala
LiftRules.loggedInTest = Full(
    () => { ... something returning Boolean ... }
)
```
