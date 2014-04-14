---
title: Merb fixtures
date: '2008-07-30'
author: Tymon Tobolski
tags: merb, ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/07/30/merb-fixtures
---

Ostatnio szukałem jakiegoś dobrego narzędzia do fixtures (nie mam pojęcia jak to można po polsku nazwa) w Merbie i znalazłem projekt na githubie <a href="http://github.com/botanicus/merb-fixtures/tree/master">merb-fixtures</a>. Niestety okazało się, że sprawia pewne problemy w szczególności z <a href="http://github.com/sam/dm-more/tree/master/dm-is-nested\_set">dm-is-nested\_set</a> z paczki dm-more DataMappera. Jednak postanowiłem się nie poddawać i korzystając z kodu merb-fixtures napisać coś własnego.

Cała zawartość pliku `fixtures.rb` prezentuje się tak:

```ruby
module Fixtures
  class Manager
    class << self
      def init
        @@fixtures = {}
      end

      def load
        Merb.logger.debug("Loading fixtures ...")
        unless Merb.env?("production")
          directory = Merb.root / "app" / "fixtures"
          if File.exist?(directory)
            Dir[directory / "*.rb"].each do |file|
              Kernel.load(file)
            end
          else
            raise 'FixturesDirectoryNotFound'
          end
        end
      end

      def create(klass, name, &block)
        unless object = klass.fixture(name)
          object = klass.new
          @@fixtures[klass] << {:name => name, :object => object}
        end
        object.instance_eval(&block) if block_given?
        object.save! if object.dirty?
        object
      end

      def fixture(klass, name)
        if fix = (@@fixtures[klass] ||= []).find {|e| e[:name] == name}
          fix[:object]
        end
      end

      def fixtures(klass)
        @@fixtures[klass]
      end

      def delete_fixtures(klass)
        @@fixtures[klass] = []
      end

      def save_all
        @@fixtures.each_pair do |_, fixtures|
          fixtures.each {|f| f[:object].save}
        end
      end
    end

  end

  module Extensions
    def self.included(base)
      base.extend(ClassMethods)
    end

    module ClassMethods
      def fixture(name)
        Manager.fixture(self, name)
      end

      def fixtures
        Manager.fixtures(self)
      end

      def delete_fixtures
        Manager.delete_fixtures(self)
      end
    end
  end
end

models = []
ObjectSpace.each_object(Class)  do |klass|
  if klass.included_modules.include?(DataMapper::Resource)
    klass.send(:include, Fixtures::Extensions)
  end
end

module Kernel
  def fixture_for(klass, name, &block)
    Fixtures::Manager.create(klass, name, &block)
  end
end
```

Teraz krótko o tym jak się tego używa.

Po pierwsze wrzucamy plik fixtures.rb do katalogu `lib` i dodajemy w pliku `config/init.rb`

```ruby
Merb::BootLoader.after_app_loads do
  require 'lib/fixtures.rb'
end
```

Jest to bardzo istotne aby umieścić `require` w tym bloku ponieważ biblioteka wymaga dostępu do klas modeli.

Następnie tworzymy katalog `app/fixtures` i w nim dla przykładu plik `category.rb` o zawartości:

```ruby
fixture_for(Category, :root) do
  self.name = 'root'
end

  fixture_for(Category, :space_ships) do
    self.name = 'Space ships'
    self.parent = Category.fixture(:root)
  end

    fixture_for(Category, :fast_space_ships) do
      self.name = 'Fast ships'
      self.parent = Category.fixture(:space_ships)
    end

    fixture_for(Category, :big_space_ships) do
      self.name = 'Big ships'
      self.parent = Category.fixture(:space_ships)
    end

  fixture_for(Category, :robots) do
    self.name = 'Robots'
    self.parent = Category.fixture(:root)
  end

    fixture_for(Category, :human_like_robots) do
      self.name = 'Human like'
      self.parent = Category.fixture(:robots)
    end

    fixture_for(Category, :other_robots) do
      self.name = 'Other'
      self.parent = Category.fixture(:robots)
    end
```

Teraz możemy załadować (poprzez `merb -i`) dane do bazy za pomocą `Fixtures::Manager.load`. Jednak najbardziej przydanym wykorzystaniem fixtures są testy...

W pliku `spec/spec_helper.rb` dodajemy:

```ruby
DataMapper.auto_migrate!
Fixtures::Manager.init

def fixtures(*classes)
  Fixtures::Manager.load
  classes.each {|klass|
    klass.fixtures.each { |e|
      instance_variable_set("@#{e[:name]}", e[:object].clone)
    }
  }
end
```

Teraz w pliku `category_spec.rb`:

```ruby
before(:each) do
  fixtures(Category)
  # można załadować kilka na raz np.
  # fixtures(Category, Product, User)
end
```

Da nam to nie tylko dostęp do obiektów za pomocą `Klasa.fixture(:nazwa)`, ale też `@nazwa` (w tym przypadku np. `@space_ships`)

Nie pozostaje nic innego tylko zabrać się do wygodnego pisanie testów ;)

P.S. Znowu wyszła tona kodu + dwa zdania...

