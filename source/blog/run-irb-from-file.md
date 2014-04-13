---
author: Tymon Tobolski
date: 2010-08-24
title: Run irb from file
tags: ruby
source: tumblr
source_url: http://tumblr.teamon.eu/post/1002794475/run-irb-from-file
---

In case I forgot.

```ruby
require "irb"
ARGV.clear
IRB.start(__FILE__)
```
