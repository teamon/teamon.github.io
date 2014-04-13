---
author: Tymon Tobolski
date: 2011-01-22
title: "Scala: Combine several Partial Functions into one"
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/2863302230/scala-combine-several-partial-functions-into-one
---

```scala
val a: PartialFunction[String, Int] = { case "a" => 1 }
val b: PartialFunction[String, Int] = { case "b" => 2 }
val c: PartialFunction[String, Int] = { case "c" => 3 }

val ab = a orElse b // combine functions a and b

ab("a") // 1
ab("b") // 2
ab("c") // MatchError

val abc = (a :: b :: c :: Nil) reduceLeft (_ orElse _) // combine list of functions

abc("a") // 1
abc("b") // 2
abc("c") // 3
abc("d") // MatchError

// Order is important
val f1: PartialFunction[Int, Int] = { case 1 => 10 }
val f2: PartialFunction[Int, Int] = { case 1 => 20 }

val f12 = f1 orElse f2
val f21 = f2 orElse f1

f12(1) // 10
f21(1) // 20
```
