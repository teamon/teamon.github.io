---
author: Tymon Tobolski
date: 2010-08-15
title: Quickly get some random image placeholders
source: tumblr
source_url: http://tumblr.teamon.eu/post/954484590/quickly-get-some-random-image-placeholders
---

```ruby
# Quickly get some image placeholders (in different dimensions)
# Usage: ruby placeholdit.rb COUNT MIN MAX

require 'net/http'

count, min, max = *ARGV.map(&:to_i)

Net::HTTP.start('placehold.it') do |http|
  count.times do
    name = "#{rand(max-min) + min}x#{rand(max-min) + min}"
    File.open("#{name}.gif", 'wb') do |f|
      f.write http.get("/#{name}").body
    end
  end
end
```
