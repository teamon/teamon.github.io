---
title: Screenshot całej strony, quicksilver i growl
date: '2008-10-11'
author: Tymon Tobolski
tags: os x, znalezione w sieci
source: jogger
source_url: http://teamon.jogger.pl/2008/10/11/screenshot-calej-strony-quicksilver-i-growl
---

Przeglądając sobie <a href="http://appleblog.pl/17-calkowicie-niezbednych-programow-i-narzedzi">17 całkowicie niezbędnych programów i narzędzi na Maka</a> trafiłem na program do robienia zrzutów stron o nazwie <a href="http://www.derailer.org/paparazzi/">Paparazzi</a>. W pierwszej chwili program wydał się całkiem sympatyczny:
![Wygląd programu Paparazzi](/assets/images/blog/screenshot-calej-strony-quicksilver-i-growl/paparazzi.png)

Jednak po chwili zabawy stwierdziłem, że wolałbym coś prostszego. Przeglądając stronę programu natrafiłem na:
> It was inspired by <a href="http://www.paulhammond.org/webkit2png/">webkit2png</a>

webkit2png jest konsolowy programem napisanym w Pythonie robiącym dokładnie to samo co Paparazzi.

Teraz wystarczyło napisać plugin do <a href="http://www.blacktree.com/">QuickSilvera</a>, który pobierze adres strony, utworzy zrzuty na pulpicie i powiadomi o zakończeniu działania za pomocą Growla. ;)

### Download:

- [webkit2png](http://www.paulhammond.org/webkit2png/)
- [Take a screenshot.scpt](/assets/images/blog/screenshot-calej-strony-quicksilver-i-growl/Take a screenshot.scpt)

### Instalacja:

Najpierw webkit2png. Wrzucamy plik do folderu `/usr/bin` i nadajemy mu prawa do wykonania

```
sudo chmod +x webkit2png
```

Wpisując w konsoli `webkit2png --help` powinniśmy otrzymać listę opcji programu.


Plik `Take a screenshot.scpt` umieszczamy w katalogu `~/Library/Application\ Support/Quicksilver/Actions` (jeśli nie ma katalogu `Actions` to należy go utworzyć). Restartujemy QuickSilvera.

### Obsługa:
![Obsługa pluginu](/assets/images/blog/screenshot-calej-strony-quicksilver-i-growl/qswebkit2png.png)

Uruchamiamy QuickSilvera, naciskamy kropkę aby przejść do trybu wpisywania tekstu, wpisujemy adres strony (http:// nie jest wymagane), potem tab, wpisujemy parę pierwszych liter polecenia, enter i gotowe. Na pierwszy rzut oka wydaje się to skomplikowane, jednak po jakimś czasie staje się naturalne i błyskawiczne :)

### A ja bym chciał coś zmienić...

Program webkit2png posiada kilka opcji, które każdy chciałby ustawić "pod siebie" - nic prostszego. Wystarczy edytować plik `Take a screenshot.scpt` a dokładniej linijkę:

```
set results to do shell script "/usr/bin/env webkit2png -CF -D ~/Desktop " & uri
```

podając parametry wedle własnych upodobań.

Dla tych co nie używają/nie chcą Growla - należy usunąć blok

```
tell application "GrowlHelperApp"
  ...
end tell
```
