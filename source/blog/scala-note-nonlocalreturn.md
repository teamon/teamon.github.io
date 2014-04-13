---
author: Tymon Tobolski
date: 2010-02-16
title: "scala note: NonLocalReturn"
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/392574485/scala-note-nonlocalreturn
---

[andrei-pamula](http://andrei-pamula.tumblr.com/post/392491987/scala-note-nonlocalreturn):

```scala
object Foo {
  def main(args: Array[String]) {
    foo(List(1, 2, 3))
  }

  def foo(l: List[Int]): Int = {
    l.foreach { (i) =>
      println(i)
      return 5
    }
    return 10
  }
}
```

This code will print “1” and then exit.

via: http://dev.bizo.com/2010/01/scala-supports-non-local-returns.html
