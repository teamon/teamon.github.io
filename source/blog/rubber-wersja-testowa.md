---
title: rubber - wersja testowa
date: '2009-05-29'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2009/05/29/rubber-wersja-testowa
---
Czyli edytor szablonów Joggera i menadżer plików z wbudowanym serwerem.

#### Lista ficzerów:

- Dodawanie, usuwanie plików z folderu `files`
- Edycja szablonów wpisów, komentarzy, logowania
- Edycja szablonów stron
- Serwer upakowujący szablony w przykładową treść - nie ma potrzeby męczenia się w panelu Joggera żeby sprawdzić jak coś będzie wyglądać.
- Podgląd nowego wpisu

#### Wymagania

Jedynym wymaganiem do uruchomienia programu jest zainstalowany interpreter [Ruby](http://ruby-lang.org)

W chwili obecnej zaimplementowana jest większość tagów szablonowych, które są opisane na Wiki. Poniżej krótki opis użycia.

### Instalacja i konfiguracja

Instalacja sprowadza się do zainstalowania gema z githuba

```bash
gem sources -a http://gems.github.com
sudo gem install teamon-rubber
```

Ustawienie loginu i hasła (hasło jest przechowywane w zakodowanej formie)

```bash
mkdir my_jogger
cd my_jogger
rubber configure
```

### Zarządzanie plikami

#### Pobranie plików z Joggera

```bash
rubber download
```

#### Wysłanie zmodyfikowanych plików

```bash
rubber upload files/my_file.html
rubber upload Szablon_koemntarzy.html
```

#### Wysłanie wszystkich plików

```bash
rubber upload files/*
```

### Uruchomienie serwera

```bash
rubber server
```

Twój jogger będzie dostępny pod adresem http://localhost:1337. Przykładowe treści można zmienić w pliku `content.`yml`. Zmiana w pliku szablonu będzie od razu widoczna po odświeżeniu przeglądarki (nie ma potrzeby restartowania serwera).

### Podgląd nowego wpisu

Dodając plik do folderu posty o nazwie np. `nowy-post.html` będzie on dostępny pod adresem http://localhost:1337/nowy%20post

Wszelkie propozycje i uwagi są bardzo mile widziane.

Kod oczywiście dostępny na [githubie](http://github.com/teamon/rubber)

