---
title: Rack - Prosty parser haml
date: '2009-01-05'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2009/01/05/rack-prosty-parser-haml
---
Jakiś czas temu stwierdziłem, że przydała by mi się aplikacja do parsowania plików [haml](http://haml.hamptoncatlin.com) podczas tworzenia designu dla strony. Z pomocą przyszedł [rack](http://rack.rubyforge.org).

Wszystko zakończyło się w 13 linijkach ;)

```ruby
require "rack/response"
require "haml"

app = Proc.new do |env|
  path = env["REQUEST_URI"].sub("/", "")
  if path =~ /\.haml$/
    [200, {"Content-type" => "text/html"}, Haml::Engine.new(File.read(path)).render]
  else
    Rack::File.new(Dir.pwd).call(env)
  end
end

run app
```

A wszystko odpalane poprzez:

```bash
thin start -R design.ru -p 9999
```

W przeglądarce wpisujemy np. "localhost:9999/foo/bar.haml" i zostanie wyrenderowany plik `bar.haml` z folderu `foo`. Pliki inne niż `.haml` nie zostaną zparsowane.

