---
author: Tymon Tobolski
date: 2011-01-14
title: "Scala collections #collect"
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/2745905040/scala-collections-collect
---

```scala
scala> List(1,2,3,4,5).filter(2<).map(2*)
res1: List[Int] = List(6, 8, 10)

scala> List(1,2,3,4,5).collect { case x if x > 2 => 2*x }
res2: List[Int] = List(6, 8, 10)
```
