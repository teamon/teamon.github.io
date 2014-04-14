---
title: Prostsze formularze w Ruby on Rails
date: '2008-07-16'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/07/16/prostsze-formularze-w-ruby-on-rails
---
Zawsze irytowało mnie pisanie formularzy. Ciągłe powtarzanie kodu w stylu:

```erb
<p>
  <%= f.label :field %>
  <%= f.text_field :field %>
</p>
```

wydało mi się nieco bezsensowne. Na szczęście jest na to rozwiązanie. Helper `form_for` posiada parametr `:builder` który pozwala na ustawienie własnego FormBuildera - klasy obsługującej "budowanie" pól formularza.

Mój wymarzony formularz wygląda teraz mniej więcej tak:

```erb
<% standard_form_for @user do |f| -%>
  <%= errors_for :user %>

  <% f.fieldset do %>
    <%= f.text_field :login, :info => "Only letters" %>
    <%= f.text_field :email %>
    <%= f.password_field :password %>
    <%= f.password_field :password_confirmation %>
  <% end %>

  <% f.fieldset "Personal info" do %>
    <%= f.text_field :first_name %>
    <%= f.text_field :last_name %>
    <%= f.text_area :description %>
  <% end %>

  <% f.submit_tag 'Save' do %>
    or <%= link_to "Back".t, user_path(@user) %>
  <% end %>
<% end %>
```

Ale po kolei, co się tak właściwie tutaj dzieje?

Na samym początku jest helper `standard_form_for`, który wygląda tak:

```ruby
def standard_form_for(name, *args, &proc)
  options = args.last.is_a?(Hash) ? args.pop : {}
  options = options.merge(:builder => StandardBuilder)
  args = (args << options)
  form_for(name, *args, &proc)
end
```

Jest to tylko wygodniejszy sposób na zapisanie `form_for` z naszym własnym builderem. Najlepiej umieścić tą metodę w `application_helper.rb`

Przejdźmy teraz do samej klasy `StandardBuilder`. Najpierw sama definicja klasy.

```ruby
# app/helpers/standard_builder.rb
class StandardBuilder < ActionView::Helpers::FormBuilder
  include ActionView::Helpers::TextHelper
  include ActionView::Helpers::FormTagHelper
end
```

Najpierw najprostsze - `f.fieldset`.

```ruby
def fieldset(legend = "", &proc)
  p = legend.blank? ? "" : @template.content_tag("legend", legend)
  concat("<fieldset>" + p, proc.binding)
  proc.call
  concat("</fieldset>", proc.binding)
end
```

Parametru `legend` chyba nie trzeba objaśniać ;). Reszta to tylko "opakowanie" obiektu Proc w tag `<fieldset>`. Można by tu dodać jeszcze więcej opcji typu `id` czy `class` jednak nigdy nie było mi to potrzebne.

W większości przypadków `input[type="submit"]` jest wstawiany poprzez helper `submit_tag`. Ja jednak postanowiłem dołączyć ją do buildera, będzie wygodniej i bardziej spójnie.

```ruby
def submit_tag(label, &proc)
  submit =  @template.tag(:input, :type => "submit", :value => label, :class => "submit")
  if proc
    concat("<p class=\"actions\">" + submit, proc.binding)
    proc.call
    concat("</p>", proc.binding)
  else
    @template.content_tag(:p, submit, :class => "actions")
  end
end
```

Wszystko co umieszczone w bloku podanym do tej metody razem z inputem zostanie opakowane w `<p class="actions">...</p>`. Dołączenie bloku jest oczywiście opcjonalne.

Przejdźmy teraz do pomocniczej metody `label`.

```ruby
def label(field, label = nil, *args)
  label ||= field.to_s.humanize
  super(field, label + ":", *args)
end
```

Tutaj tylko dodane ":" na końcu. (W tym miejscu można również dodać metody obsługujące i18n).

Po tej krótkie umysłowej rozgrzewce czas na coś nieco bardziej skomplikowanego.

```ruby
def self.create_p_field(method_name)
  define_method(method_name) do |label, *args|
    options = args.extract_options!
    info = options.delete(:info)
    clean = options.delete(:clean)


    options[:class] ||= (method_name == "text_area" ? "" : method_name.split("_").first)
    return super(label, options) if clean


    info = info ? @template.content_tag(:span, info, :class => "info") : ""
    @template.content_tag(:p, label(label, options[:label]) + super(label, options) + info)
  end
end
```

W tym miejscu dzieje się cała magia ;). Jest to metoda klasy, która definiuje metodę egzemplarza za pomocą `define_method` i podanych parametrów. Podobnie jak w powyższym przykładzie, metodę tę można dowolnie zmodyfikować w celu dopasowania do własnych potrzeb.

Na początku pobieramy i usuwamy kilka parametrów z hasha `options`. Następnie ustawiamy klase na podstawie nazwy metody. Opcja `clean` pozwala nam na wstawienie czystego pola w niestandardowej sytuacji. Potem dodajemy `<span class="info">` jeśli został podany parametr `info`. Na koniec pakujemy wszystko w `<p>...</p>` dodając pole `label`.

Teraz wystarczy tylko wygenerować metody dla wszystkich typów pól:

```ruby
field_helpers.each do |name|
  create_p_field(name) unless ["label"].include?(name)
end
```

I to by było na tyle. Jak już wspomniałem, możliwości dostosowania są nieograniczone. A wszystko to aby ułatwić sobie życie :)

[`standard_builder.rb`](http://teamon.drakor.eu/standard_builder.rb) do pobrania.

