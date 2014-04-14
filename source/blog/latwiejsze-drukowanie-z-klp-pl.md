---
title: Łatwiejsze drukowanie z klp.pl
date: '2008-09-07'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/09/07/latwiejsze-drukowanie-z-klp-pl
---
Serwis <a href="http://klp.pl">klp.pl</a> znają chyba wszyscy uczniowie. Portal nie raz ratował życie mojej klasie (liceum, mat-fiz-inf :p). Posiada jednak jedną wadę - nie można wydrukować na raz całego artykułu tylko trzeba odwiedzić każdą strone po kolei.

Tak było do dziś! Postanowiłem umilić sobie i innym drukowanie, a wynikiem tego postanowienia jest <a href="http://teamon.drakor.eu/klp.rb">40 linijek kodu</a> w Ruby. Smacznego.

Sposób użycia:

```bash
ruby klp.rb http://ludzie-bezdomni.klp.pl/a-8239.html > ludzie-bezdomni.html
```

Dla zainteresowanych jeszcze którki opis. Program pobiera wersje do druku (pierwszą stronę) sprawdza ilość stron, pobiera je wszystkie i łączy.

```ruby
require 'net/http'
require 'iconv'

class Klp
  def initialize(url)
    @http = Net::HTTP.new('klp.pl')
    match = url.match(%r[http://(.+).klp.pl/a-(\d+).html])
    @name = match[1]
    @id = match[2]
    @content = []
  end

  def fetch_page(page)
    resp, body = @http.get "/doda.php?akcja=druk&ida=#{@id}&strona=#{page}"
    Iconv.iconv('utf-8', 'iso-8859-2', body).first
  end

  def parse_content(body)
    body[%r[</h1>(.+)strona: &nbsp;&nbsp;]um, 1]
  end

  def join
    page = fetch_page(1)
    @title = page[%r[<h1>(.+?)</h1>], 1]
    pages_count = page.scan(%r[<a href=\?akcja=druk&ida=\d+&strona=(\d+)>]u).flatten.map {|e| e.to_i}.max
    @content << parse_content(page)
    if pages_count > 1
      (2..pages_count).each do |p|
        @content << parse_content(fetch_page(p))
      end
    end

    puts @title
    puts "----"
    puts @content
  end
end

Klp.new(ARGV[0]).join

```

P.S. Czytajcie lektury!

P.S. 2 Wersja online: <a href="http://klp.heroku.com">http://klp.heroku.com</a>

