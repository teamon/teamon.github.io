---
author: Tymon Tobolski
date: 2010-10-02
title: "Scala String replace"
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/1229257960/scala-string-replace
---

```scala
implicit def repl4str(s: String) = new Object {
    def %(pairs: (String, String)*) = (s /: pairs){
      case (s, (k, v)) => s.replace("%{" + k + "}", v)
    }
}

"foo %{bar} and %{baz}" % ("bar" -> "xxx", "baz" -> "blah")
// => "foo xxx and blah"

```
