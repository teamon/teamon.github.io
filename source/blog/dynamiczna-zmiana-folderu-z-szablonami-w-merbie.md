---
title: Dynamiczna zmiana folderu z szablonami w Merbie
date: '2009-01-27'
author: Tymon Tobolski
tags: merb, ruby
source: jogger
source_url: http://teamon.jogger.pl/2009/01/27/dynamiczna-zmiana-folderu-z-szablonami-w-merbie
---
Tym razem będzie bardzo krótko. Potrzebowałem sprawdzenia za każdym razem wartości `Setting[:theme]` i na jej podstawie ustawić katalog "poszukiwań" pliku z szablonem ...

```ruby
class Application < Merb::Controller
  before do
    template_roots[1] = [
      "themes" / Setting[:theme] / "views", :_template_location
    ]
  end
end
```

... i działa ;]

Dzięki temu nie trzeba przekazywać do każdego `display/render` bezwzględnej ścieżki do pliku.

