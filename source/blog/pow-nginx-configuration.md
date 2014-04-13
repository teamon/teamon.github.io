---
author: Tymon Tobolski
date: 2011-07-28
title: pow + nginx configuration
source: tumblr
source_url: http://tumblr.teamon.eu/post/8180751671/pow-nginx-configuration
---

```bash
# Install pow
$ curl get.pow.cx | sh

# Install powder
$ gem install powder

# See that firewall is fucked
$ sudo ipfw show
00100     0        0 fwd 127.0.0.1,20559 tcp from any to me dst-port 80 in <- THIS ONE!!!
65535 81005 28684067 allow ip from any to any

# Disable it
$ powder down

# See? It's gone!
$ sudo ipfw show
65535 81005 28684067 allow ip from any to any

# Required nginx configuration
    server {
      listen  80;
      server_name *.dev;
      location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_redirect off;
        proxy_pass http://localhost:20559; # The real pow port
      }
    }
```
