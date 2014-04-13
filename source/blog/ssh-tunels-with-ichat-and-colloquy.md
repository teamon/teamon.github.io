---
author: Tymon Tobolski
date: 2010-06-08
title: SSH tunels with iChat and Colloquy
tags: mac
source: tumblr
source_url: http://tumblr.teamon.eu/post/676237829/ssh-tunels-with-ichat-and-colloquy
---

University`s internet connection sucks. The only open ports are 22,80 and 433. I wanted to have access to jabber and IRC but those ports are blocked. Solution? - SSH tunnels and some scripting to switching it on and off quickly. (This is just setup for iChat and Colloquy, not a ssh-tunnels tutorial!

### Requirements

All you need is server with ssh on port 22.

### Setup

##### iChat

I created two accounts in iChat with the same login but different server settings.

![](http://media.tumblr.com/tumblr_l3oz24F52E1qat4ul.png)

First one has localhost and port `8000`, and other one with `MY_REAL_JABBER_HOST` and `MY_REAL_JABBER_PORT`.

###### Colloquy

Again, I created two connections.

![](http://cl.ly/a012912eab3cd7d2cbbc/content)

One for localhost and port `7000`, and second for `irc.freenode.net` and `6667`. (You can use any server you want)


### Scripting
You need to set up ssh tunnels. I do it with

```sh
ssh -N  USER@MY_SSH_HOST -L 7000:irc.freenode.net:6667 -L 8000:MY_JABBER_HOST:MY_JABBER_PORT
```

And the last one - AppleScript.

```scpt
(* Enable tunels *)

tell application "Colloquy"
  tell connection 1 to connect
  tell connection 2 to disconnect
end tell

tell application "iChat"
  set enabled of service 1 to true
  tell service 1 to log in

  set enabled of service 2 to false
  tell service 2 to log out
end tell
```

```scpt
(* Disable tunels *)

tell application "Colloquy"
  tell connection 2 to connect
  tell connection 1 to disconnect
end tell

tell application "iChat"
  set enabled of service 2 to true
  tell service 2 to log in

  set enabled of service 1 to false
  tell service 1 to log out
end tell
```

Just save those files as `enable-tunels.app` and `disable-tunels.app`
and you'll have quick access to them via spotlight.
