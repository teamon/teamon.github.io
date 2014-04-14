---
title: ie6png fix tool
date: '2008-02-14'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/02/14/ie6png-fix-tool
---
Skończyłem pisać CSS dla strony. Użyłem dość sporo plików png z przeźroczystością. Szybki test, no tak - IE6 nie obsługuje kanału alpha. Rozwiązanie jest dość proste, osobny arkusz dla IE6 i wykorzystanie jego filtrów

```css
selektor {
  background-image: none;
  filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src='path/to/image', sizingMethod='crop');
}
```

Na dobra ale tych obrazków trochę jest i średnio mi się chcę ręcznie to zamieniać...
Rozwiązanie: chwilka z Ruby ;]


```ruby
#!/usr/bin/ruby

File.open(ARGV[0]) do |f|
  style = ""
  f.read.scan(/([^{}]+?)\{[^}]*background(?:-image)?:\s*url\((.*?)\).*?\}/m) do |sel, url|
    puts sel + " " + url
    style << "#{sel} {
  background-image: none;
  filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src=#{url}, sizingMethod='crop');
}"
  end
  File.open("style_ie6.css", "w") { |ie| ie.write style }
end
```

A potem tylko

```bash
ruby ~/ie6png.rb style.css
```

i mamy gotowy plik `style_ie6.png`. Nic tylko wrzucić w komentarz warunkowy :)

