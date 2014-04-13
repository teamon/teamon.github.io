---
author: Tymon Tobolski
date: 2011-04-18
title: Setting up Intel Cluster Compiler with XCode 4
tags: mac, xcode
source: tumblr
source_url: http://tumblr.teamon.eu/post/4725618392/setting-up-intel-cluster-compiler-with-xcode-4
---

### The easy part

Download Composer XE for Mac from Intel website, run .dmg, click .pkg, click, click, blah, select XCode integration, click, done.

It will install everything under `/opt/inte`l and &hellip; under `/Developer/` (no, symlinks, separate install - well, wtf?)

To use icc from command line it is first required to run
```bash
source /opt/intel/bin/iccvars.sh intel64
```

If you use zsh, then you'll have to modify `/opt/intel/bin/iccvars.sh` file and change all `==` to `=`.

Now icc should work from command line. Btw, better add this `source ...` line to you `.bashrc`/`.zshrc` or you'll end up typing that command on every new shell.

### The "how to make people frustrated" part
Run XCode, choose new c++ project. In project setting select correct compiler: <img alt="image" src="http://media.tumblr.com/tumblr_ljv6dpQcLN1qat4ul.png" />

You can try to hit cmd+b and pray it will work. I'm not that lucky.

It doesn't work without executing this dumb `source ...` line. I tried to setup build phases, pre-actions and&hellip; nothing worked. So, here is the hacky way to make it work.

```bash
cd /Developer/usr/bin
mv icc icc.orig
touch icc
chmod +x icc
```

Then open new icc file in editor and put there:

```bash
#!/bin/zsh

source /opt/intel/bin/iccvars.sh intel64
/Developer/usr/bin/icc.orig $*
```

Do the same with `icpc`.

Now license server shit will be loaded when xcode executes `/Developer/usr/bin/icc`

But, that's not everything yet. `/Developer/usr/lib` is missing some libraries. Just copy what needed from `/opt/intel/lib` (I needed `libimf.a`, but it may vary).

After all that hacks it *should* work&hellip;
