---
title: Prosty 960 gridder
date: '2009-08-19'
author: Tymon Tobolski
tags: javascript
source: jogger
source_url: http://teamon.jogger.pl/2009/08/19/prosty-960-gridder
---
Mimo iż [System 960.gs](http://960.gs) zapewnia bookmarklet włączający siatkę na dowolnej stronie postanowiłem naskrobać swój - prostszy i (imho) ładniejszy ;]

Smacznego:
 [Przeciągnij mnie!](javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://s.teamon.eu/960gs/960gridder.js';})();)

Kod: </p>

```javascript
// use with bookmarklet
// javascript:(function(){document.body.appendChild(document.createElement('script')).src='http://s.teamon.eu/960gs/960gridder.js';})();


g = document.getElementById("gridoverlay")
if(g){
  if(g.style.display == "none") g.style.display = "block"
  else g.style.display = "none"
} else {
  g = document.createElement('div')
  g.id = "gridoverlay"
  g.style.width = "960px"
  g.style.height = document.height + "px"
  g.style.backgroundImage = "url(http://s.teamon.eu/960gs/12_col.png)"
  g.style.position = "absolute"
  g.style.left = "50%"
  g.style.top = "0"
  g.style.marginLeft = "-480px"
  document.body.appendChild(g)
}
```
