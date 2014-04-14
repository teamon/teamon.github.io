---
title: Pobieranie listy plików z DropBoxa
date: '2008-11-19'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/11/19/pobieranie-listy-plikow-z-dropboxa
---

Tym razem mała odskocznia od Merba, ale nadal w klimatach Ruby.

Jeśli ktoś nie słyszał, <a href="http://getdropbox.com">Dropbox</a> to usługa która pozwala trzymać pliki na serwerze poprzez utworzenie specjalnego folderu w systemie i używanie go jak każdego innego. Dropbox sam uaktualni pliki na serwerze. Ponadto umożliwia synchronizacje plików na kilku komputerach oraz współdzielenie folderów. Więcej na <a href="http://getdropbox.com">stronie programu</a>.

Wszystko pięknie, ale Dropbox ma jedna wadę. Możemy podać komuś link do pliku (z folderu Public) ale do całego folderu już nie. Autorzy twierdzą, że to ze względów bezpieczeństwa - ich sprawa. Nie udostępnili też żadnego API (np. z wymaganym kluczem czy coś).

Z pomocą przychodzi dostępny ajaxowy "Web Interface" i <a href="http://mechanize.rubyforge.org/">Mechanize</a>. Plan jest całkiem prosty: zalogować się i pobrać listę plików dla podanej ścieżki.

Dość gadania, kodzik:

```ruby
require "rubygems"
require "mechanize"

class Dropbox
  def initialize(email, password)
    @agent = WWW::Mechanize.new
    page = @agent.get('https://www.getdropbox.com/')
    form = page.forms.first
    form.email = email
    form.password = password
    @agent.submit(form)
  end

  def get(path)
    links = []
    @agent.post("https://getdropbox.com/browse2/#{path}?ajax=yes", "d=0&mini&t=6bf8f0d91d").links.each do |link|
      unless link.text.blank? or link.text == "Parent directory"
        links << if link.href =~ %r[/browse2/#{path}/.+]
          [link.text, get(link.href.sub('/browse2/', ''))]
        else
          link
        end
      end
    end
    links
  end
end
```

A odpalamy to tak:

```ruby
dbs = Dropbox.new("your@email.com", "yourpass")
links = dbs.get "Public"
pp links
```

Tablica `links` zawiera odnośniki do wszystkich plików z danego katalogu. Można teraz wygenerować sobie html`a z linkami, czy wrzucić skrypt na serwer aby lista plików była zawsze aktualna. Można by się jeszcze pobawić w pobranie wszystkich plików i spakowanie do archiwum :) .

Nie jestem tylko pewien parametru `t`. Można go łatwo podejrzeć za pomocą <a href="http://www.getfirebug.com/">FireBuga</a> po zalogowaniu się na stronie. Za każdym razem był taki sam, możliwe jednak, iż dla innego konta będzie inny.

P.S. Tak teraz patrze, to w sumie szału nie ma, ale jak już napisałem to puszcze może komuś się przyda.

