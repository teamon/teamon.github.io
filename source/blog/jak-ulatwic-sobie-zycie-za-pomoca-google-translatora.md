---
title: Jak ułatwić sobie życie za pomocą google translatora
date: '2008-06-18'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/06/18/jak-ulatwic-sobie-zycie-za-pomoca-google-translatora
---
Napisałem sobie aplikacje w <a href="http://rubyonrails.pl">RoR</a> z użyciem gettext ( [how to](http://manuals.rubyonrails.org/read/chapter/105)). Wygenerowałem pliki `.po` i... no właśnie, ktoś to musi przetłumaczyć. Wpadłem na dwa pomysły: a) znaleźć frajera, który to zrobi za free, b) zrobić to samemu.

Nie znalazłem nikogo, a że leniwy jestem to od razu zacząłem kombinować jakby tu sobie ułatwić/przyspieszyć pracę. Padło na <a href="http://translate.google.com/translate_t">google translator</a>. Rozejrzałem się za API ale nic ciekawego nie znalazłem (jedynie to, że można użyć GET i wszystkie parametry podać w urlu). Pozostało tylko przefiltrować plik .po, odpytać wielkie G, wyciągnąć przetłumaczoną frazę i zapisać w pliku.

A tak to wygląda:

```ruby

#!/opt/local/bin/ruby

require "net/http"
require "iconv"

$KCODE = 'utf8'

# ustawienie języków i kodowania
lang_from = "en"
lang_to = "pl"
enc = "latin2" # latin2 zwraca translator dla en|pl

# wygodny jestem :P
class String
  def iconv(to, from)
    Iconv.iconv(to, from, self)
  end
end

# czytamy plik
file = File.read(ARGV[0])

# mały regexp ...
f = file.gsub(/msgid "(.+?)"\nmsgstr "(.*?)"/) do |m|
  # tłumaczenie jest puste
  if $2 == ""
    id, str = $1, ""
    # pobranie przetłumaczonej wersji
    Net::HTTP.get("www.google.com", "/translate_t?hl=en&ie=UTF8&text=#{id.gsub(" ", "%20")}&langpair=#{lang_from}|#{lang_to}").iconv("utf8", enc).first.scan(/<div id=result_box dir="ltr">(.+?)<\/div>/m) do |e|
      str = e.first.gsub(" | ", "|") # dla "Xxx|Yyy" translator zwraca "Xxx | Yyy"
      puts "#{id} => #{str}"
    end
    "msgid \"#{id}\"\nmsgstr \"#{str}\""
  else
  # jeśli już jest tłumaczenie to zostawiamy w spokoju
    m
  end
end

# zapisanie do pliku
File.new(ARGV[0], "w").puts f
```

a potem:

```bash
$ ./google_t.rb /path/to/myapp/po/pl_PL/myapp.po
```

I już. Wiadomo, tłumaczenie nie jest idealne, ale w prostych przypadkach się sprawdza (poszczegołne słowa). Pliki wypada przejrzeć jeszcze np. <a href="http://www.poedit.net/">poEdit`em</a> w celu poprawienia błędów. Przynajmniej można się trochę pośmiać ;)
