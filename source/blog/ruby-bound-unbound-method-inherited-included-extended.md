---
title: Ruby - bound/unbound method, inherited, included, extended
date: '2009-06-03'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2009/06/03/ruby-bound-unbound-method-inherited-included-extended
---
### Bound i unbound method

Ruby pozwala na "wyciągnięcie" pojedynczej metody z obiektu w postaci obiektu `Method`, który można później wywołać. Ruby dostarcza dwa rodzaje metod - `Method` oraz `UnboundMethod`. Podstawową różnicą między tymi dwoma jest to, że `Method` możemy wywołać, a `UnboundMethod` nie. Spowodowane jest to tym, iż obiekt `UnboundMethod` nie ma zadeklarowanego odbiorcy metody. Obiekt `UnboundMethod` można oczywiście "przypiąć" do odpowiedniego obiektu, ale o tym za chwilę.

Na początek prosty przykład.

```ruby
class Timmy
  attr_accessor :age

  def say
    "Timmy!"
  end

  def move(x)
    "Moved #{x} meters"
  end
end

timmy = Timmy.new

say_method = timmy.method(:say) # => #<Method: Timmy#say>
move_method = timmy.method(:move) # => #<Method: Timmy#move>
```

Metoda `method(sym)` jest zdefiniowana w klasie `Object` i dostępna we wszystkich obiektach. Zwraca obiekt `Method` z metodą o podanej nazwie. Metoda ma zadeklarowanego odbiorcę, tak więc można ją wykonać. Metody wykonuje się tak samo jak obiekty `Proc` czyli poprzez `call(parametry)`.

```ruby
say_method.call # => "Timmy!"
move_method.call(4) # => "Moved 4 meters"
```

Taki obiekt metody można "odczepić" od odbiorcy:

```ruby
unbound_say = say_method.unbind # => #<UnboundMethod: Timmy#say>
```

Tak "odczepionej" metody nie można już wywołać:

```ruby
unbound_say.call
NoMethodError: undefined method `call' for #<UnboundMethod: Timmy#say>
  from (irb):30
```

Innym sposobem na uzyskanie obiektu `UnboundMethod` jest pobranie metody proste z klasy.

```ruby
unbound_method = Timmy.instance_method(:say)
# => #<UnboundMethod: Timmy#say>
```

Taki obiekt można teraz "przypiąć" do odpowiedniego obiektu:

```ruby
tim = Timmy.new
unbound_method.bind(tim) # => #<Method: Timmy#say>
```

Jednak przypinanie metody z klasy do obiektu tej samej klasy ma trochę mały sens. Jednak można to wykorzystać na przykład w celu wywołania metody nadnadklasy: </p>

```ruby
class Person
  def say
    "HELLO"
  end
end

class Kid < Person
  def say
    "Hi"
  end
end

class Jimmy < Kid
  def say
    "Jimmy!"
  end
end

jim = Jimmy.new
jim.say # => "Jimmy!"
jim.class.superclass.superclass.instance_method(:say).bind(jim).call
# => "HELLO"
```

### included, extended, inherited

Metody `included`, `extended` oraz `inherited` są (jak można się domyślić) wywoływane kiedy korzystamy z `include`, `extend` albo dziedziczenia.

Kiedy dziedziczymy po jakiejś klasie, wywoływana jest na niej metoda `inherited` (o ile została zadeklarowana):

```ruby
class Car
  def self.inherited(base)
    puts "#{base} inherits from Car"
  end
end

class Mercedes < Car; end
class Audi < Car; end
class BMW < Car; end

# >> Mercedes inherits from Car
# >> Audi inherits from Car
# >> BMW inherits from Car
```

Daje to większe możliwości operacji na klasach pochodnych i pozwala na wykonanie dodatkowych operacji.

Kolejną i chyba najczęściej wykorzystywaną metodą jest `included`. Metoda ta dotyczy modułu, który jest "includowany". Dzięki temu zamiast pisać:

```ruby
class Audi
  include Fast::InstanceMethods
  extend Fast::ClassMethods
end
```

można to uprościć do zapisu:

```ruby
class Audi
  include Fast
end
```

a całą resztę pozostawić modułowi:

```ruby
module Fast
  def self.included(base)
    puts "#{base} includes Fast"
    base.send(:include, InstanceMethods)
    base.extend(ClassMethods)
  end

  module InstanceMethods
    def go
      "Goooooo #{self}"
    end
  end

  module ClassMethods
    def describe
      "I`m #{self}"
    end
  end
end

class Audi
  include Fast
end

class BMW
  include Fast
end

# >> Audi includes Fast
# >> BMW includes Fast

Audi.describe # => "I`m Audi"
BMW.describe # => "I`m BMW"
Audi.new.go # => "Goooooo #<0x241bc>"
BMW.new.go # => "Goooooo #<0x24090>"
```

Ostatnią metodą jest `extended`, która jest praktycznie identyczna w działaniu jak `included` z tym że jest wywoływana podczas użycia `extend`:

```ruby
module Slow
  def self.extended(base)
    puts "Slow extends #{base}"
  end

  def describe
    "I`m slow #{self}"
  end
end

class Mercedes
  extend Slow
end

# >> Slow extends Mercedes

Mercedes.describe # => "I`m slow Mercedes"
```

Zarówno `inherited` jak i `included` są często wykorzystywane w przeróżnych bibliotekach. Przewagą dołączania modułu nad korzystaniem z dziedziczenia jest to, że moduł możną dołączyć praktycznie zawsze, podczas gdy ustawienie nadklasy nie zawsze jest możliwe.

