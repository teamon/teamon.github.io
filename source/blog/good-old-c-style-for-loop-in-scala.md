---
author: Tymon Tobolski
date: 2011-01-21
title: Good old C-style for loop in scala
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/2861044632/good-old-c-style-for-loop-in-scala
---

```scala
def cfor(s: Int, p: (Int) => Boolean, k: (Int) => Int)(f: (Int) => Unit){
    if(p(s)){
        f(s)
        cfor(k(s), p, k)(f)
    }
}

cfor(0, 5>, 1+){ i =>
    println(i)
}

// 0
// 1
// 2
// 3
// 4
```
