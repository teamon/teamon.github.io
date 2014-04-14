---
title: JRuby + Merb + Sequel
date: '2009-04-01'
author: Tymon Tobolski
tags: merb, ruby
source: jogger
source_url: http://teamon.jogger.pl/2009/04/01/jruby-merb-sequel
---

Ktoś pewnie stwierdzi "kolejny post o Merbie, bezsensu za chwile i tak się połączy z Rails". Kiedy to nastąpi to jeszcze nie wiadomo, poza tym [Merb](http://merbivore.com) aż tak szybko nie zniknie a migracja na Rails3 ma być w miare bezbolesna. Ale ja nie o tym. [DataMapper](http://datamapper.org) mnie ostatnio wkurzył, co chwile coś się wywala, coś nie działa. Doszedłem do wniosku, że mam dość. Wybór padł na [Sequela](http://sequel.rubyforge.org/). A skoro Sequel działa pod [JRuby](http://jruby.codehaus.org) (w przeciwieństwie do DataMapper) to dlaczego by nie pobawić się też z Javową implementacją Ruby. Z tej mojej zabawy wyszedł ten oto pokrętny mini-tutorial. Enjoy.

### 1. Instalacja JRuby

Instalacja sprowadza się do pobrania źródeł, kompilacji oraz ustawienia ścieżek. Miejsce instalacji (u mnie `/Users/teamon/jruby`) jest oczywiście dowolne.

```bash
curl http://dist.codehaus.org/jruby/1.2.0/jruby-src-1.2.0.tar.gz > jruby.tar.gz
tar -xf jruby.tar.gz
cd jruby-1.2.0
ant
cd ..
mv jruby-1.2.0 /Users/teamon/jruby
```

Ustawienie `PATH` w `~/.bash\_profile`:

```bash
export PATH="$PATH:/Users/teamon/jruby/bin"
```

Zwróćcie uwagę na to, że ścieżka ma na końcu `/bin`.

Aby sprawdzić czy wszystko jest ok:

```bash
$ jruby -version
jruby 1.2.0 (ruby 1.8.6 patchlevel 287) (2009-03-31 rev 6586) [i386-java]
```

Działa! (można się pobawić `jirbem` :P)

### 2. Instalacja niezbędnych gemów

```bash
jgem install jruby-openssl # jruby aż się o to prosi, to niech ma ;]
jgem install merb-core merb-gen merb-haml mongrel # merb i mongrel, thin nie działa pod JRuby
jgem install sequel merb_sequel postgres-pr
jgem install webrat # rspec wymaga
jgem install hpricot --version '~>0.6.1' # a tego z kolei chce webrat...
```

Na razie tyle wystarczy

### 3. Wygenerowanie aplikacji

Korzystamy z `merb-gen`. Aha, od teraz wszystkie merbowe komendy należy odpalać poprzedzając je `jruby -S`.

```bash
jruby -S merb-gen core --orm=sequel --testing-framework=rspec --template-engine=haml juby
cd juby
```

Szkielet aplikacji mamy gotowy. Nie użyłem `merb-gen app`, bo to wrzuca pełno niepotrzebnych rzeczy (np. datamappera).

No, jak już się tyle narobiliśmy to choć coś mogłoby zadziałać. Sprawdźmy!

```bash
$ jruby -S merb
Loading init file from /Users/teamon/Sites/current/juby/config/init.rb
Loading /Users/teamon/Sites/current/juby/config/environments/development.rb
 ~ No database.yml file found at /Users/teamon/Sites/current/juby/config/database.yml.
 ~ A sample file was created called /Users/teamon/Sites/current/juby/config/database.yml.sample for you to copy and edit.
```

No tak, zawsze coś... Tym razem to tylko informacja o braku pliku `database.yml`. Wypadałoby to naprawić. Zmieniamy nazwe pliku `config/database.yml.sample` na `config/database.yml` a do środka wrzucamy:

```yaml
---
# This is a sample database file for the Sequel ORM
:development: &amp;defaults
  :adapter: postgres
  :database: juby_development
  :username: teamon
  :password: pass
  :host: localhost
  :encoding: utf8

:test:
  <<: *defaults
  :database: juby_test

:production:
  <<: *defaults
  :database: juby_production
```

I lepiej od razu stwórzmy bazy:

```bash
createdb juby_development
createdb juby_test
```

Odpalamy serwer (`jruby -S merb`) - działa.

### ~~Model~~ <ins>Testy!

Nie uczyli, że zaczyna się od testów?

Czas na przygotowanie sobie środowiska do testowania. Niestety `autospec` jak na razie nie działa pod JRuby. No ale jak na razie zwykły `spec` wystarczy. Aby wszystko działało sprawnie i ładnie trzeba (no, może nie trzeba ale tak będzie lepiej) wrzucić do `spec/spec.opts`:

```yaml
--color
--format specdoc
```

A do `spec/spec_helper.rb`:

```ruby
Spec::Runner.configure do |config|
  config.include(Merb::Test::ViewHelper)
  config.include(Merb::Test::RouteHelper)
  config.include(Merb::Test::ControllerHelper)

  config.before(:all) do
    Sequel::Model.db.drop_table(*Sequel::Model.db.tables)
    Sequel::Migrator.apply(Sequel::Model.db, "schema/migrations")
  end
end
```

Pierwsze da nam ładny output w konsoli, a drugie zadba o wyczyszczenie bazy przy każdym uruchomieniu testów.

Przejdźmy teraz do prawdziwych testów. Z lenistwa znowu wykorzystamy `merb-gen`

```bash
jruby -S merb-gen model post title:String,permalink:String,content:String,published_at:DateTime
```

Dostaliśmy model (`app/models/post.rb`), migracje (`schema/migrations/001_post_migration.rb`) i **test** (`spec/models/post_spec.rb`). Co istotne, podane typy muszą być wpisane wielką literą (tak naprawdę to nazwy klas ruby) ponieważ tak działają migracje w Sequelu (polecam spojrzeć w plik z migracją)

Możemy już teraz odpalić sobie test

```bash
jruby -S spec -O spec/spec.opts spec/models/post_spec.rb
```

Test się odpala, ale jak na razie nie zawiera żadnego kodu testującego - trzeba to jak najszybciej naprawić!

Otwieramy `spec/models/post_spec.rb` i wrzucamy:

```ruby
require File.join( File.dirname( __FILE__ ), '..', "spec_helper" )

describe Post do

  before do
    Post.destroy_all

    @post = Post.create(
      :title => 'Jruby + Merb + Sequel Tutorial',
      :content => 'Lorem ipsum dolor sit amet, consectetur adipisicing elit.'
    )
  end

  it "should be valid" do
    @post.should be_valid
  end

  it "should require title" do
    @post.title = ""
    @post.should_not be_valid
    @post.errors.on(:title).should_not be_nil
  end

  it "should have correct permalink" do
    @post.permalink.should == "jruby-merb-sequel-tutorial"
  end

  it "should have unique permalink" do
    copy = Post.new :title => 'Jruby + Merb + Sequel Tutorial', :content => "Lorem ipsum dolor sit amet, consectetur adipisicing elit."
    copy.should_not be_valid
    copy.errors.on(:permalink).should_not be_nil
  end

end
```

Można się mniej więcej domyśleć o co chodzi, a tak w skrócie: `before` odpala się przed każdym testem (każde "it ...") i w tym wypadku usuwa wszystkie posty i tworzy jeden, w kolejnych testach mamy sprawdzenie czy post jest poprawny, czy wymaga podania tytułu, czy tworzy dobry permalink oraz czy wymga aby permalink był unikalny.

Uruchommy jeszcze raz nasz test:

```bash
jruby --client -S spec -O spec/spec.opts spec/models/post_spec.rb

Post
- should be valid
- should require title (FAILED - 1)
- should have correct permalink (FAILED - 2)
- should have unique permalink (FAILED - 3)

1)
'Post should require title' FAILED
expected valid? to return false, got true
spec/models/post_spec.rb:20:

2)
'Post should have correct permalink' FAILED
expected: "jruby-merb-sequel-tutorial",
     got: nil (using ==)
spec/models/post_spec.rb:25:

3)
'Post should have unique permalink' FAILED
expected valid? to return false, got true
spec/models/post_spec.rb:30:

Finished in 0.429 seconds

4 examples, 3 failures
```

Jak widać model nie przechodzi 3 testów. Czas by coś z tym zrobić (tak, to już, teraz model)

```ruby
class Post < Sequel::Model
  validates do
    presence_of :title
    uniqueness_of :permalink
  end

  def title=(value)
    self[:title] = value
    self.permalink = Iconv.iconv('ascii//translit//IGNORE', 'utf-8', value).first.gsub(/[^\x00-\x7F]+/, '').gsub(/[^a-zA-Z0-9-]+/, '-').gsub(/^-/, '').gsub(/-$/, '').downcase
  end
end
```

Pare linijek, jak widać walidacja podobna jak w ActiveRecord i sztuczka z nadpisaniem metody `title=`

Odpalamy testy:

```bash
jruby -S spec -O spec/spec.opts spec/models/post_spec.rb


Post
- should be valid
- should require title
- should have correct permalink
- should have unique permalink


Finished in 0.394 seconds


4 examples, 0 failures
```

Na razie to tyle. W sumie to miało być tylko wprowadzenie do JRuby + Merb i troche Sequel`a ale jak już napisałem to niech zostanie, może się komuś przyda.

PS. Pisałem to o 4 w nocy, jak tak teraz patrze to ten rspec tu ni w.. w sensie srednia pasuje, ale trudno :P

\* - nie muszą, może być podany typ specyficzny dla danej bazy, ale tak jest lepiej. Cytując <a href="http://sequel.rubyforge.org/rdoc/files/doc/schema\_rdoc.html">Sequel RDoc:

> Also, new in Sequel 2.10 is the ability to have database independent migrations using ruby classes as types. When you use a ruby class as a type, Sequel translates it to the most comparable type in the database you are using. (...) Basically, if you use one of the ruby classes above, it will translate into a database specific type. If you use a lowercase method, symbol, or string to specify the type, Sequel won’t attempt to translate it.
