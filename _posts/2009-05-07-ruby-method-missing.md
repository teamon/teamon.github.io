---
title: Ruby - ! poprzez method_missing
lang: pl
---

Dla tych co nie wiedzą co to `method_missing` i co chodzi z `!` polecam posty na blogu radarka:
[Ruby a metody z '?' i '!' w nazwie](http://radarek.jogger.pl/2009/02/21/ruby-a-metody-z-i-w-nazwie/) oraz
[method_missing w Rubym - nie pomiń niczego!](http://radarek.jogger.pl/2008/03/26/method-missing-w-rubym-nie-pomin-niczego/).

Załóżmy, że piszemy bibliotekę dodającą sporo metod do klasy String i chcielibyśmy, żeby każda metoda
miała swój odpowiednik zakończony `!`.

Można to zrobić w taki sposób:

```ruby
class String
  def plural
    self !~ /s$/ ? self + "s" : self # tylko dla przykładu
  end

  def plural!
    self.replace(plural)
  end

  def foo
    ...
  end

  def foo!
    self.replace(foo)
  end
end
```

Ale jest to co najmniej średnio wygodne.

Z pomocą przychodzi `method_missing`.
W bardzo łatwy sposób można zdefiniować regułę, która wyłapie odwołanie do nieistniejącej metody zakończonej `!`.

```ruby
class String
  # dla przykładu, to nie jest idealna implementacja :P
  def plural
    self !~ /s$/ ? self + "s" : self
  end
end


class String
  def method_missing(method, *args, &block)
    if method.to_s =~ /(.+)!$/ && respond_to?($1)
      self.class.class_eval <<-EOF
        def #{method}(*args, &block)
          replace send(:#{$1}, *args, &block)
        end
      EOF
      self.send(method, *args, &block)
    else
      super
    end
  end
end

c = "cat"
c.plural # => "cats"
c # => "cat"
c.plural! # => "cats"
c # => "cats"

d = "dog"
d.plural! # => "dogs"
d # => "dogs"
```

W tym przykładzie `method_missing` sprawdza czy jest dostępna metoda `plural`, a następnie definiuje metode `plural!`.
Niektórzy pewnie zapytają: "a co robi tam ten eval? po co to?". Już wyjaśniam.
Poprzez zdefiniowanie methody `plural!` gdy następnym razem wywołamy `c.plural!` metoda `method_missing`
nie zostanie wywołana, ponieważ metoda `plural!` już istnieje.
No tak, ale to przecież bez różnicy, działa tak samo, prawda? Okazuje się, że jednak jest różnica...

Prosty benchmark wszystko dobitnie pokazuje:

```ruby
require 'benchmark'

class String
  def plural
    self !~ /s$/ ? self + "s" : self
  end
end

Benchmark.bm do |b|
  n = 1000000
  b.report("defined plural!") {
    class String
      def plural!
        replace plural
      end
    end

    s = "cat"
    n.times { s.plural! }
  }

  String.send(:undef_method, :plural!)

  b.report("not defining") {
    class String
      def method_missing(method, *args, &block)
        if method.to_s =~ /(.+)!$/ && respond_to?($1)
          replace send($1, *args, &block)
        else
          super
        end
      end
    end

    s = "cat"
    n.times { s.plural! }
  }

  b.report("defining") {
    class String
      def method_missing(method, *args, &block)
        if method.to_s =~ /(.+)!$/ && respond_to?($1)
          self.class.class_eval <<-EOF
            def #{method}(*args, &block)
              replace send(:#{$1}, *args, &block)
            end
          EOF
          self.send(method, *args, &block)
        else
          super
        end
      end
    end

    s = "cat"
    n.times { s.plural! }
  }
end
```

A oto wyniki:

```bash
[teamon ~/Desktop] ruby1.9 str_bench.rb
                  user      system    total     real
defined plural!   2.280000  0.010000  2.290000  ( 2.311500)
method_missing    6.140000  0.030000  6.170000  ( 6.215187)
combo             2.450000  0.020000  2.470000  ( 2.492664)

[teamon ~/Desktop] ruby str_bench.rb
                  user      system    total     real
defined plural!   1.710000  0.010000  1.720000  ( 1.734700)
method_missing    6.060000  0.020000  6.080000  ( 6.137054)
combo             2.700000  0.010000  2.710000  ( 2.737030)

[teamon ~/Desktop] jruby str_bench.rb
                  user      system    total     real
defined plural!   1.229000  0.000000  1.229000  ( 1.203000)
method_missing    5.874000  0.000000  5.874000  ( 5.874000)
combo             1.723000  0.000000  1.723000  ( 1.724000)


# jakby co:
[teamon ~/Desktop] ruby -v
ruby 1.8.6 (2008-03-03 patchlevel 114) [universal-darwin9.0]

[teamon ~/Desktop] ruby1.9 -v
ruby 1.9.1p0 (2009-01-30 revision 21907) [i386-darwin9.6.0]

[teamon ~/Desktop] jruby -v
jruby 1.2.0 (ruby 1.8.6 patchlevel 287) (2009-03-31 rev 6586) [i386-java]
```


Jak widać dla ruby1.9 i jruby różnica między zdefiniowaniem "na sztywno" `plural!` jest niewielka
(dla 1.8.6 jest już trochę więcej).
Łatwo jednak zauważyć, że używanie samego `method_missing` bez definiowania metody znacznie odstaje wydajnościowo.

Swoją drogą trochę mnie dziwi, że 1.9 okazuje się wolniejsze od 1.8.6.
