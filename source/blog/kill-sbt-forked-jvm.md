---
author: Tymon Tobolski
date: 2012-02-09
title: Kill sbt forked JVM
tags: scala, sbt, akka
---

Recently I’ve been playing with [akka][akka] under [sbt][sbt]. I often run sbt console and then use `run` command to execute my app. It works great for single threaded applications that exits by itself. When using akka, there are couple of threads that do not quit. Hitting `ctrl + c` quits running application AND unfortunately also sbt. I figured out, that it can be fixed with a little bit of hacking.

First, set `fork in run := true` is build.sbt. Then you can stop forked jam with the following shell line:

```bash
# killsbt.sh
ps -ef | grep java | grep '.sbt/boot' | awk '{print $2}' | xargs kill
```

I’d suggest making it an alias or even better save as Shell Extension available via hotkey using awesome [alfred app][alfred].

[akka]: http://akka.io
[sbt]: https://github.com/harrah/xsbt/wiki
[alfred]: http://www.alfredapp.com

