---
title: "Datamapper: asocjajcje polimorficzne (i nie tylko)"
lang: pl
---

Większości znających Ruby on Rails temat ["Polymorphic Associations"](http://en.wikipedia.org/wiki/Polymorphic_association) nie jest zapewne obcy ( z wiki railsów nie działa). W skrócie chodzi o relacje odnoszącą się do obiektów z różnych klas. (Nie umiem tłumaczyć, ale skoro nadal to czytasz to pewnie wiesz o.c.b.)

Przejdźmy do konkretów. O ile w ActiveRecord wystarczy dodac `:polymorphic => true` to w api Datamappera nie znalazłem takie opcji. Jednak nic nie stoi na przeszkodzie aby napisać to samemu.

Posłużę się pewnym przykładem: chcę aby każda operacja stworzenia nowego obiektu została zapisana. Do tego celu zostanie wykorzystany model `Event`.

Na początek dwa proste modele, których tworzenie będziemy logować.

```ruby
class Project
  include DataMapper::Resource
  property :id, Serial
  property :name, String

  after :create do
    Event.create :comment => "Project created", :related => self
  end
end

class Ticket
  include DataMapper::Resource
  property :id, Serial
  property :title, String

  after :create do
    Event.create :comment => "Ticket created", :related => self
  end
end
```

W każdym z nich został dodany hook (`after :create ... `), który będzie wywołany w momencie utworzenia obiektu.

Teraz czas na model `Event`

```ruby
class Event
  include DataMapper::Resource

  property :id, Serial
  property :comment, String
  property :created_at, DateTime

  property :related_id, Integer
  property :related_class, String

  def related=(object)
    @related = object
    self.related_id = @related.id
    self.related_class = @related.class.to_s
  end

  def related
    @related ||= Kernel.const_get(related_class).get(related_id)
  end
end
```

Pole `related_id` przechowuje id obiektu a `related_class` nazwę jego klasy. Istotnym elementem jest tutaj ```rubyKernel.const_get(related_class).get(related_id)``` Metoda `Kernel#const_get` zwraca stałą (w naszym przypadku klasę) na podstawie podanej nazwy. (Innym sposobem byłoby użycie `eval`)

Zobaczmy co nam to wszystko dało:

```ruby
@project1 = Project.create :name => 'Project 1'
# => #<Project id=1 name="Project 1">
@ticket1 = Ticket.create :title => 'Ticket 1'
# => #<Ticket id=1 title="Ticket 1">

Event.all
# => [#<Event id=1 comment="Project created" related_id=1 related_class="Project">, #<Event id=2 comment="Ticket created" related_id=1 related_class="Ticket">]

Event.get(1).related
# => #<Project id=1 name="Project 1">
Event.get(1).related.name
# => "Project 1"

Event.get(2).related
# => #<Ticket id=1 title="Ticket 1">
Event.get(2).related.title
# => "Ticket 1"
```

Aby umilić sobie trochę życie możemy dorzucić jeszcze `method_missing` do klasy `Event`

```ruby
def method_missing(method_name, *args, &block)
  if method_name.to_s == self.related_class.downcase
    return related
  end
  super
end
```

(Więcej na temat `method_missing` [u radarka](http://radarek.jogger.pl/2008/03/26/method-missing-w-rubym-nie-pomin-niczego/))

Pozwoli to na użycie:

```ruby
Event.get(1).project
# => #<Project id=1 name="Project 1">

# ale już nie

Event.get(1).ticket
# => undefined method `ticket' for #<Event:0x111a2c8> (NoMethodError)
```

Jednej rzeczy brakuje - lista eventów dla danego obiektu:

```ruby
class Project
  include DataMapper::Resource
  property :id, Serial
  property :name, String

  after :create do
    Event.create :comment => "Project created", :related => self
  end

  def events
    Event.all(:related_id => self.id, :related_class => "Project")
  end
end

class Ticket
  include DataMapper::Resource
  property :id, Serial
  property :title, String

  after :create do
    Event.create :comment => "Ticket created", :related => self
  end

  def events
    Event.all(:related_id => self.id, :related_class => "Ticket")
  end
end

@project1.events
# => [#<Event id=1 comment="Project created" related_id=1 related_class="Project">]
@ticket1.events
# => [#<Event id=2 comment="Ticket created" related_id=1 related_class="Ticket">]
```

Wszystko pięknie działa, jednak niektórzy mogli zauważyć, że część kodu się powtarza - zróbmy coś z tym!

Hook `after :create` oraz metode `events` można by wyrzucić do osobnego modułu a następnie dołączyć go do naszych modeli

```ruby
module Eventable
  def self.included(base)
    base.class_eval do
      after :create do
        Event.create :comment => event_comment, :related => self
      end
    end
  end

  def events
    Event.all(:related_id => self.id, :related_class => self.class.to_s)
  end
end

class Project
  include DataMapper::Resource
  include Eventable
  property :id, Serial
  property :name, String

  def event_comment
    "Project created"
  end
end

class Ticket
  include DataMapper::Resource
  include Eventable
  property :id, Serial
  property :title, String

  def event_comment
    "Ticket created"
  end
end
```

Metoda `event_comment` została dodana aby było możliwe podanie rożnego komentarza do eventu dla każdego modelu z osobna.

I takim oto dość prostym sposobem otrzymujemy przejrzysty i całkiem sprytny kawałek kodu :)

Na deser [całość z jednym pliku gotowe do uruchomienia.](http://gist.github.com/73931)
