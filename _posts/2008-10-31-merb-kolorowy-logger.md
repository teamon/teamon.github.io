---
title: "Merb: kolorowy logger"
lang: pl
---
[Merb](http://merbivore.com) wczoraj został wypuszczony na świat w wersji RC4. Z tej okazji\* rozpoczynam cykl kilku postów z przydatnymi sztuczkami związanymi z tym właśnie frameworkiem. Na pierwszy ogień idzie kolorowanie wiadomości z merbowego loggera.

`Merb.logger` jak sama nazwa służy do logowania informacji. Jakich i gdzie zależy od ustawień dla danego środowiska `(config/environments/*.rb)`. Pliki konfiguracyjne merba są proste, czytelne i opatrzone komentarzem, więc nie ma sensu ich opisywać. Istotne natomiast jest to, że czasami łatwo się w logach pogubić, szczególnie podczas pracy nad projektem. Merb loguje wszystko tak samo - jako zwykły tekst. I tu właśnie narodził się pomysł, żeby informacje różnego typu pokazywać w różnych kolorach, tak aby od razu było wiadomo co jest co i ułatwić szukanie interesujących nas linijek.

Poniżej znajduję się "patch" który koloruje logi w zależności od poziomu.

```ruby
# lib/color_logger.rb

module Merb
  class Logger
    # 30=black 31=red 32=green 33=yellow 34=blue 35=magenta 36=cyan 37=white
    Colors = Mash.new({
      :fatal => 31,
      :error => 31,
      :warn  => 33,
      :info  => 37,
      :debug => 36
    })

    Levels.each_pair do |name, number|
      class_eval <<-LEVELMETHODS, __FILE__, __LINE__

      def #{name}(message = nil)
        self << "\033[0;#{Colors[name]}m%s\033[0m" % message if #{number} >= level
        self
      end

      def #{name}!(message = nil)
        self << "\033[0;#{Colors[name]}m%s\033[0m" % message if #{number} >= level
        flush if #{number} >= level
        self
      end

      LEVELMETHODS
    end

    def my_debug(message = nil)
      self <<  "\033[1;35m%s\033[0m" % message
      self
    end
  end
end
```

Aby kolorowanie działało tylko w trybie development wystarczy dodać `require "lib/color_logger.rb"` w pliku `config/environments/development.rb` i jest to chyba najlepsze rozwiązanie. W trybie production i tak zazwyczaj logujemy do pliku a nie na STDOUT więc kolorowanie tylko by zaśmiecało pliki.

Niektórych pewnie dziwi metoda `my_debug`. Dodałem ją dlatego, iż datamapper korzysta z `Merb.logger.debug` do logowania zapytań do bazy, co nieco utrudnia znalezienie naszego własnego wywołania, a tak `Merb.logger.my_debug(var)` i od razu rzuca się w oczy ;) Do tego prosty helper:

```ruby
# app/helpers/global_helpers.rb
def d(var)
  Merb.logger.my_debug(var.inspect)
end
```

Kolory oczywiście można sobie pozmieniać. Można też wyłączyć logowanie zapytań do bazy poprzez:

```ruby
# config/init.rb
Merb::BootLoader.after_app_loads do
  DataObjects::Postgres.logger = DataObjects::Logger.new(File.open('/dev/null', 'w'), Merb.logger.level)
end
```

I to by było na tyle jeśli chodzi o kolorowanie logów w konsoli. Smacznego ;)  
W następnych odcinkach m.in. [flash](http://teamon.eu/2008/10/31/merb-flash/), String#t, error\_messages\_for i prostsze formularze.

\* Jakiś powód musiałem wymyślić :P
