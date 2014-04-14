---
title: Instalacja Symfony na Mac OS 10.5 (XAMPP)
date: '2008-01-03'
author: Tymon Tobolski
tags: php, symfony
source: jogger
source_url: http://teamon.jogger.pl/2008/01/03/instalacja-symfony-na-mac-os-10-5-xampp
---

Tutoriali instalacyjnych symfony jest sporo, ale żaden nie odnosi się do XAMPP'a. Najczęściej jest wykorzystane dostarczony w Leopardem PHP oraz DarvinPorts. Stwierdziłem, że to się może komuś przydać. Jak dla mnie XAMPP jest najlepszą (najwygodniejszą) opcją. Wykorzystam go jako serwer developerski a nie produkcyjny więc nie chce mi się bawić w konfiguracje itp. XAMPP oferuje banalnie prostą instalacje (kreator) - parę klików i gotowe.

Przedstawiony tu opis jest dziełem zebranym po mojej drodze przez fora macplug oraz oficjalne forum symfony (jak sie nie wie to trzeba szukać). Szczególnie przydatny będzie dla tych, co przerzucili się z Windowsa na Maca i nie mają doświadczenia z konsolą unixową (sam do takich należy, ale jak to mówią - człowiek uczy się całe życie). Mój opis jest sprawdzony pod OS X ale możliwe że podobnie należy postąpić na innych platformach.

Wchodzimy na <a href="http://www.apachefriends.org/en/xampp-macosx.html">stronę projektu</a> i ściągamy najnowszą wersję.

Odpalamy instalera, klikamy dalej, dalej, dalej...

Teraz musimy aktywować domyślnie wyłączone konto root'a. W tym celu odpalamy program **Narzędzia katalogowe** (w OS X < 10.5 NetInfo Manager) i z menu **Edycja** wybieramy **Włącz użytkownika Root**. Teraz musimy ustawić ścieżkę dostępu do plików XAMPP'a. W Terminalu wpisujemy

```bash
open .bash_profile
```

Jeżeli dostaniemy komunikat, że plik nie istnieje wpisujemy:

```bash
touch .bash_profile
open .bash_profile
```

Otworzy się TextEdit. Wpisujemy w nim:

```bash
PATH=/Applications/xampp/xamppfiles:/Applications/xampp/xamppfiles/bin:$PATH
export PATH
```

Następnie jako root (korzystamy z polecenia `su`) w Terminalu wpisujemy:

```bash
mampp
```

Jeżeli wszystko jest ok pokaże nam się lista dostępnych poleceń. Aby uruchomić serwer wpisujemy:

```bash
mampp start
```

Należy pamiętać, że wszystkie operacje wymagają zalogowania jako root.

Ostatnią czynnością jest edycja pliku `httpd.conf` (`/Applications/xampp/etc/httpd.conf`). Zamieniamy linijkę (u mnie na nieedytowanym pliku 227)

```bash
AllowOverride AuthConfig
```
na:

```bash
AllowOverride All
```
Bez tego najprawdopodobniej przy próbie uruchomienia projektu symfony dostaniemy error 500

Teraz pozostaje tylko wykonać <a href="http://www.symfony-project.org/installation">instalację Symfony</a> poprzez PEAR

Mam nadzieje, iż powyższy opis jest dość łopatologiczny jednak gdyby ktoś miał problemy to proszę śmiało pisać.

