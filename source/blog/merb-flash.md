---
title: Merb - flash
date: '2008-10-31'
author: Tymon Tobolski
tags: merb, ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/10/31/merb-flash
---
UPDATE: Zamiast calej zabawy - plugin <a href="http://github.com/teamon/merb-flash/tree/master">merb-flash :)

Kontynuując <a href="http://teamon.eu/2008/10/31/merb-kolorowy-logger/">serię o sztuczkach w <a href="http://merbivore.com">Merbie tym razem przedstawię coś, czego najbardziej mi zabrakło - railsowego flasha.

<!-- more -->

Twórcy Merba zrezygnowali z takiego rozwiązania, i postawili na dodatkowy parametr <em>\_message przekazywany w url jako zakodowany ciąg znaków.

```ruby
redirect resource(@product), :message => "Product was successfully created"
```

Jednak według mnie to rozwiązanie jest po prostu brzydkie. Podpatrując nieco z pluginu <a href="http://github.com/ivey/merb\_has\_flash/tree/master">merb\_has\_flash zamieniłem ów <em>:message na wersję wykorzystującą sesje bez zmieniania API.

```ruby
# lib/flash.rb


class Flash
  def initialize(*args)
    @attrs = Mash.new(*args)
    @keepers = []
  end


  def []=(key, value)
    @attrs[key] = value
    keep key
  end
    
    
  def update(hash)
    @attrs.update(hash)
    hash.keys.each {|key| keep key}
  end
        
        
  def method_missing(method_name, *args, &amp;block)
    @attrs.send(method_name, *args, &amp;block)
  end


  def keep(key)
    key = key.to_s
    @keepers << key unless @keepers.include?(key)
  end


  def sweep
    @attrs.keys.each {|key| @attrs.delete(key) unless @keepers.include?(key)}
    @keepers = []
  end
end


class Merb::Request
  def message
    session['flash'] || {}
  end
end


class Merb::Controller
  after :sweep_flash
  def sweep_flash
    session["flash"].sweep if session["flash"]
  end


  def redirect(url, opts = {})
    default_redirect_options = { :message => nil, :permanent => false }
    opts = default_redirect_options.merge(opts)
    if opts[:message]
      opts[:message] = {:notice => opts[:message]} unless opts[:message].is_a?(Hash)
      session['flash'] = Flash.new unless session['flash'].is_a?(Flash)
      session['flash'].update(opts[:message])
    end
    self.status = opts[:permanent] ? 301 : 302
    Merb.logger.info("Redirecting to: #{url} (#{self.status})")
    headers['Location'] = url
    "You are being <a href=\"#{url}\">redirected."
  end
end
```

Jak już wspomniałem, sposób użycia się w zasadzie nie zmienia. Jedyną zmianą jest to, że gdy podamy jako parametr <em>:message ciąg znaków to zamieni się on na <em>{:notice => "nasza wiadomosc"}. Dzięki temu nie musimy pisać:

```ruby
redirect resource(@product), :message => {:notice => "Product was successfully created"}
```

```ruby
redirect url(:default), :message => {:error => "Product not found"}
```

Wyświetlanie wiadomości podobnie jak w Rails: (wersja haml)

```ruby
- message.each_pair do |type, msg|
  = tag :div, msg, :class => type.to_s, :id => "flash"
```

W celu załadowania tej "poprawki" dopisujemy do pliku <em>conifg/init.rb 

Warto jeszcze wspomnieć, że patch działa razem z merb-auth.

Do zobaczenia w następnym odcinku :P
