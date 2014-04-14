---
title: "Merb: cucumber + webrat, czyli wszystko co chcielibyście wiedzieć o testowaniu"
date: "2008-12-02"
author: Tymon Tobolski
tags: merb, ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/12/02/merb-cucumber-webrat-czyli-wszystko-co-chcielibyscie-wiedzie
---

Tym razem będzie o testowaniu aplikacji napisanej w [Merbie](http://merbivore.com).

Większość pewnie zna framework testujący [RSpec](http://rspec.info). Razem z RSpecem dostępny jest Story Runner. Jednak jak można wyczytać na stronie projektu:

> RSpec’s Story Runner is now deprecated and will be extracted out to a separate gem soon.
  For more info on cucumber, see [http://github.com/aslakhellesoy/cucumber/wikis](http://github.com/aslakhellesoy/cucumber/wikis)

 I to właśnie wspomnianego _ogórka_ opisze.

[Cucumber](http://github.com/aslakhellesoy/cucumber/wikis) podobnie jak RSpec Story Runner służy do testowania (i dokumentacji) aplikacji za pomocą czytelnych dla każdego scenariuszy zapisanych w formie zwykłego tekstu. Taki scenariusz jest przetwarzany i dopasowywany do odpowiednich, zdefiniowanych w osobnym pliku kroków. Główne zalety frameworka to m.in. możliwość przetestowania całej aplikacji od modelu przez kontroler po widok tak, jakby to robił zwykły użytkownik oraz "darmowa" dokumentacja aplikacji w formie przykładów użycia.

(Jeśli ktoś nie jest zaznajomiony z tematem, to polecam ["Plain text stories"](http://www.google.pl/search?q=plain%20text%20stories), a poza tym myślę, że przykład wszystko wyjaśni.)

[Webrat](http://github.com/brynary/webrat/tree/master) natomiast pozwala na intuicyjne zapisanie tego, co robiłby użytkownik korzystający z aplikacji

```ruby
visit home_path
click_link "Sign up"
fill_in "Email", :with => "good@example.com"
select "Free account"
click_button "Register"
```

### Instalacja

Zakładam, że Merb jak i RSpec jest już zainstalowany ;)

#### webrat + cucumber
```
$ sudo gem install webrat cucumber
```

#### plugin [merb_cucumber](http://github.com/david/merb_cucumber/tree/master)

Jeśli ktoś jeszcze nie dodał githuba do źródeł, to:
```
$ gem sources -a http://gems.github.com
```

a potem wystarczy:

```
$ sudo gem install david-merb_cucumber
```

W katalogu aplikacji:
```
$ merb-gen cucumber --session-type webrat
```

Cucumber jest już zainstalowany i gotowy do pracy. Do katalogu aplikacji został dodany folder `features`, w którym to należy umieścić scenariusze. Warto przejrzeć zawartość tego folderu gdyż zawiera on ładny przykład scenariusza oraz kilka często używanych kroków.

W szczególności spodobał mi się plik `features/steps/common_webrat.rb` zawierający kroki opisujące działania wykonywane za pomocą webrata.

### Może jakiś przykład?

Oto i on. Posłużę się kawałkiem obecnie rozwijanej przeze mnie aplikacji. Podaje kod modelu tylko po to, aby łatwiej było zrozumieć co się dzieje ;)

```ruby
class Site
  include DataMapper::Resource

  property :id, Serial

  property :name, String, :nullable => false
  property :domain, String, :nullable => false
  property :description, Text
  property :keywords, String
end
```

Kontroler oraz widoki praktycznie nie różnią się od tych wygenerowanych przez `merb-gen resource` - standard.

Scenariusze grupowane są w pliki "właściwości/cech" (feature). Warto teraz wspomnieć, że cucumber nie narzuca żadnych konwencji nazewnictwa. Ważne tylko aby pliki scenariuszy miały rozszerzenie `.feature`, a pliki kroków znajdowały się w folderze `steps` (kroki są oczywiście pisane w Ruby, więc pliki będą kończyły się na `.rb`) - nazwa nie ma znaczenia.

Na pierwszy ogień pójdzie dodawanie nowej strony. Na początku krótki opis:

```feature
Feature: Create site
  To create site
  An admin
  Must fill the form.
```

Nie ma on większego znaczenia, jednak warto streścić tu zawarte niżej scenariusze.

Zajmijmy się teraz pierwszym przypadkiem - wypełniamy formularz, strona zostaje dodana i jesteśmy przekierowywani do listy wszystkich stron. A tak to wygląda:

```feature
Feature: Create site
  To create site
  An admin
  Must fill the form.

  Scenario: Creating new site
  Given no sites exist
  When I go to /sites
  And I follow "Add site"
  And I fill in "name" with "Cucumber"
  And I fill in "domain" with "cucumber.org"
  And I fill in "description" with "I love cucumbers"
  And I press "Add"
  Then I should see an notice message
  And I should see table like
    | Name | Domain |
    | Cucumber | cucumber.org |
```

Zapisujac scenariusz (razem ze wstępem) jako `create_site.feature` i uruchamiając `$ rake features` otrzymamy:
![cucumber pending](/assets/images/blog/merb-cucumber-webrat/pending.png)

Jak widać, otrzymaliśmy ładnie pokolorowany scenariusz. Niebieskie kroki zostały pominięte ze względu na brak kroku dla pierwszej linii scenariusza. Żółty kolor oznacza właśnie, iż linia nie została dopasowana do żadnego kroku. Poniżej znajdują się kawałki kodu które można użyć do implementacji brakujących kroków.

Utwórzmy teraz plik `steps/site_steps.rb` a w nim:

```ruby
Given /^no sites exist$/ do
  Site.all.destroy!
end

# ten krok przyda się na później, ale opisze go teraz
Given /^site with name "(.*)" and domain "(.*)" exists$/ do |name, domain|
  Given "no sites exist" # wywołanie kroku znajdującego się powyżej
  Site.create(:name => name, :domain => domain)
end

Then /^I should see table like$/ do |table|
  table.hashes.first.keys.each do |head|
    response.should have_xpath("//table/tr/th[. = '#{head}']")
  end
  table.hashes.each do |hash|
    hash.each_pair do |key, value|
      response.should have_xpath("//table/tr/td[. = '#{value}']")
    end
  end
end
```

Składnia kroków jest bardzo prosta: Given/When/Then + RegExp + blok opcjonalnie z parametrami.
Poprzez zastosowanie wyrażeń regularnych można wykorzystać ten sam krok dla różnych danych co znacznie zmniejsza ilość potrzebnych kroków. Przyczynie się do tego również możliwość wywoływania innych kroków z wewnątrz kroku. Ostatni krok wykorzystuje <a href="http://github.com/aslakhellesoy/cucumber/wikis/using-fit-tables-in-a-feature">tabele</a> i selektory XPath do sprawdzenia poprawności strony wynikowej.

Odpalmy testy ponownie. Powinno się pokazać wynik podobny do:
![cucumber pass](/assets/images/blog/merb-cucumber-webrat/pass.png)
Działa :D

Dodajmy jeszcze jeden scenariusz, tym razem sprawdzający czy aplikacja zachowa się poprawnie w przypadku próby dodania strony o istniejącej już nazwie: (na koniec pliku `create_site.feature`)

```
Scenario: Creating site with existing name or domain
  Given site with name "Cucumber" and domain "cucumber.org" exists
  When I go to /sites
  And I follow "Add site"
  And I fill in "name" with "Cucumber"
  And I fill in "domain" with "cucumber.org"
  And I press "Add"
  Then the creating request should fail
  And I should see an error message
  ```

Wykorzystamy tu drugi krok, który utworzy w bazie stronę o nazwie "cucumber" i domenie "cucumber.org".

Po uruchomieniu okaże się, że nasza aplikacja nie przechodzi testu:
![cucumber fail](/assets/images/blog/merb-cucumber-webrat/fail.png)
Aby to naprawić należy nice zmienić model:

```ruby
property :name, String, :nullable => false, :unique => true
property :domain, String, :nullable => false, :unique => true
```
I oto co uzyskamy:
![cucumber pass](/assets/images/blog/merb-cucumber-webrat/pass2.png)
Tadam ;]



Mam nadzieję, że ten krótki tutorial przybliży nieco zagadnienie testowania aplikacji za pomocą scenariuszy. Jeszcze raz polecam <a href="http://github.com/aslakhellesoy/cucumber/wikis">wiki cucumbera</a> - można znaleźć tam odpowiedzi na wiele pytań, jak również <a href="http://github.com/aslakhellesoy/cucumber/tree/master/examples">zbiór przykładów</a> i jeszcze <a href="http://github.com/qrush/cucumber_seeds/tree/master">kilku innych</a>. W ostateczności można się o coś zapytać w komentarzach ;)

Na koniec mała ściąga all-in-one

```bash
sudo gem install webrat cucumber
gem sources -a http://gems.github.com
sudo gem install david-merb\_cucumber
merb-gen cucumber --session-type webrat
rake features
```

Miłego testowania.

### Edit:
Dla tych co nie lubią/nie znają angielskiego albo po prostu chcą potem pokazać scenariusze komuś kto nie zna tego języka jest specjalna opcja. Cucumber pozwala <a href="http://github.com/aslakhellesoy/cucumber/wikis/spoken-languages">tworzyć scenariusze w dowolnym języku</a>, np. polskim\*.

P.S. Na potrzeby tego wpisu blog musiał się poszerzyć o 120px :P

\* - Może jutro to opisze, dzisiaj już nie mam siły myśleć.

### EDIT: Autotest

Aby `features` uruchamiały się automatycznie wystarczy zainstalować najnowszą wersje merb\_cucumber (`sudo gem install david-merb_cucumber`), uruchomić `merb-gen cucumber` w katalogu aplikacji oraz dodać do pliku `cucumber.yml` linijke z profilem autotest i opcjami np. takimi:

```
autotest: -r features --format pretty features
```

Opcja `-r` features automatycznie ładuje wszystkie pliki z katalogu `features`. Teraz wystarczy już tylko uruchomić `autospec` w katalogu aplikacji. (Działa pod rspec 1.1.11)
