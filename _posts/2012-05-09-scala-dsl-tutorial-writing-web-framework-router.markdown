---
title: Scala DSL tutorial - writing a web framework router
source: Monterail Blog
source_url: http://monterail.com/blog/2012/scala-dsl-tutorial-writing-web-framework-router/
---

## Goal


Recently released [Play 2.0](http://playframework.org) framework brings new way of creating web services
to Java community. It's nice and fun, but I dislike few components. One of them is the router with its custom routes definitions file, separate compiler and weird logic.
As a Ruby developer I started wondering if it could be implemented in Scala as simple DSL.
The requirements were quite simple:

* statically compiled
* statically typed
* easy to use
* extensible
* it should provide (again, statically typed) reverse router
* use type inference as much as possible
* do not use much parentheses


## Design

So basically, what is a router? It could be represented as `PartialFunction[Request, Handler]` and that's how it is implemented in Play. Let's get back to Play's original router for a second.

During compilation process, `conf/routes` file is parsed, converted to `.scala` files inside `target/src_managed` directory and then compiled to bytecode.
There are two files generated: `routing.scala` and `reverse_routing.scala`. `routing.scala` is just one huge `PartialFunction` with every route described as `case` statement. `reverse_routing.scala` contains deep object structure to make calling e.g. `routes.Application.index()` possible. I do **NOT** like that.

Let's get started with "How to build useful DSL in Scala".

## End user interface

I have no idea what are the "best practices" with DSL design, I've never read a single book on that topic. This is the way that works for me.

Starting with the end result just feels natural and straightforward.
First, describe _what_ you want, then implement that - simple.

I started with very basic example, `GET /foo` that would route to `Application.foo()`

```scala
GET "/foo" Application.foo
```

looks quite nice. Unfortunately, it can't be implemented in Scala without using parentheses.



## Note on operator syntax.

Method invocation like:

```scala
A.op(B)
```

can be written as

```scala
A op B
```

As well as:

```scala
A.op(B).opp(C)
```

can be written as

```scala
A op B opp C
```

But that syntax only applies to methods that take exactly one parameter,
so: `objectA method objectB`.

In first DSL example (`GET "/foo" Application.foo`) the middle part is String object, so we can't apply this rule there. What about adding some "middle words"?


```scala
GET on "/foo" to Application.foo // Or with parentheses
GET.on("/foo").to(Application.foo)
```


This can be compiled! `GET` can be an object that represents HTTP method,
`on` is method, then `"/foo"` comes as parameter, then `to` is another method and finally `Application.foo` is a `Function0[Handler]`. Having that I made a mistake and started implementing it. Then I had to throw away huge part of code because it didn't met all requirements.

I dug deeper and came to path parameters. How to write a route that would match `GET /foo/{id}` and call `Application.show(id)`? Then I came up with an idea for:

```scala
GET on "foo" / * to Application.show
```

That looked really nice. `/` as path separator, `*` as parameter placeholder
and `Application.show` as `Function1[Int, Handler]`. Why this works? `/` is a method and `*` is an object. One might think that this would
be equivalent to:

```scala
GET.on("foo")./(*).to(Application.show) // wrong!
```

Actually, because of [operator precedence in Scala](http://stackoverflow.com/questions/2922347/operator-precedence-in-scala) it is equivalent to:

```scala
GET.on( "foo"./(*) ).to(Application.show)
```

which turns out to be very great news (see below for "why").

Few other examples of that syntax:

```scala
GET on "foo" to Application.foo
PUT on "show" / * to Application.show
POST on "bar" / * / * / "blah" / * to Application.bar
```

One last (for now) thing - reverse routing. Play's default router
has a limitation that there can only be one router per action (and that sucks).
If there is already route defined, why not assign that to `val` and user
for reverse routing?

```scala
val foo = GET on "foo" to Application.foo
```

Simple. Now just put some routes inside object and it's done.

```scala
object routes {
  val foo = GET on "foo" to Application.foo
  val show = PUT on "show" / * to Application.show
  val bar = POST on "bar" / * / * / "blah" / * to Application.bar
}
```

From now it will be possible to call `routes.foo()` or `routes.show(5)`
and get nice paths.

The next part of this post will describe most parts of internal implementation.
You might now finish and grab this library at
[http://github.com/teamon/play-navigator](http://github.com/teamon/play-navigator), but I strongly recommend reading about the implementation details.


## Implementation


There are two hard parts: types and arity. Functions in Scala can have
from 0 to 22 parameters. In Scala it is represented
with `Function0` to `Function22`.
I will show later what are the consequences of this.

In [play-navigator](http://github.com/teamon/play-navigator) `Route` has several parameters:


* HTTP method
* path definition
* handler function


I will describe all parts using example route:

```scala
val foo = GET on "foo" / * to Application.show
```

We already know that it is equivalent to

```scala
val foo = GET.on( "foo"./(*) ).to(Application.shows)
```

I'll start from left side. First, `GET` is undefined, so let's make one.

```scala
sealed trait Method
case object ANY extends Method
case object GET extends Method
case object POST extends Method
```

Here I defined two most common HTTP methods + `ANY` as catch-all method as objects with common parent type.
Ok, now we might implement `on` method, but we don't know what argument
it will take.
Let's focus on `"foo" / *` part for a while.

There might be many variants of path:

```
"foo" / "bar" / "baz" "foo" / * / "blah" * / * / *
```

The good part is that we have finite set of types that comes as parts of the path.
It's either static path or parameter placeholder. Said that,
we can express this directly in Scala:

```scala
sealed trait PathElem
case class Static(name: String) extends PathElem
case object * extends PathElem
```

Here we have `case class` that wraps regular `String` and object `*` that
has it's own type `*.type`.
Unfortunately everything here is closely related, so I have to describe some more data structures now.
As I previously said, Scala has 23 different types
of functions (with different arity). I want type system to compare number
of path placeholders with number of function arguments and raise an error
if they do not match. To do that, we need different versions of `RouteDefN`. I'll reduce the number to just 3:

```scala
sealed trait RouteDef[Self] {
  def withMethod(method: Method): Self
  def method: Method
  def elems: List[PathElem]
}

case class RouteDef0(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef0]
case class RouteDef1(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef1]
case class RouteDef2(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef2]
```

The reason for `Self` type parameter and `withMethod` method will be described a bit later.

Note that those `RouteDefN`'s don't have type parameters (and I said that I want to
check as much as possible during compilation). The fact is that `RouteDefN` knows
only about it's HTTP method and path elements. It has nothing to do with
handler function itself (yet).

The next challenge is how to convert

```scala
GET on "foo" / * / "bar"
```

into

```scala
RouteDef1(GET, List(Static("foo"), *, Static("bar")))
```

Implicit functions to the rescue!

First, we need to convert `String` to `RouteDef0`:

```scala
implicit def stringToRouteDef0(name: String) = RouteDef0(ANY, Static(name) :: Nil)
```

Any `String` is already a simple `RouteDef0` with `ANY` method. Next, the same trick with `*`:

```scala
implicit def asterixToRoutePath1(ast: *.type) = RouteDef1(ANY, ast :: Nil)
```

In this case we need `RouteDef1` since there is already one parameter placeholder.
Now we need `/` method on `RouteDefN` objects:

```scala
case class RouteDef0(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef0] {
  def /(static: Static) = RouteDef0(method, elems :+ static)
  def /(p: PathElem) = RouteDef1(method, elems :+ p)
}

case class RouteDef1(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef1]{
  def /(static: Static) = RouteDef1(method, elems :+ static)
  def /(p: PathElem) = RouteDef2(method, elems :+ p)
}

case class RouteDef2(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef2]{
  def /(static: Static) = RouteDef2(method, elems :+ static)
}
```

The rule of `/` method is simple, if it gets `Static` part it stays within the same class,
if it gets `*` it returns "higher" numbered route. `RouteDef2` does not allow passing `*`
since we don't have `RouteDef3` class.
To finish this part we need one more implicit conversion from `String` to `Static`

```scala
implicit def stringToStatic(name: String) = Static(name)
```

Ok, now we have something like this:

```scala
GET on someRouteDef
```

This one is a bit tricky. How to make `on` method to return the exact same type as `someRouteDef`?

Let's get back to `Method` definition. It has `on` method that take type parameter `R` and calls
`withMethod` on `routeDef`.

```scala
sealed trait Method {
  def on[R](routeDef: RouteDef[R]): R = routeDef.withMethod(this)
}
```

Remember the `withMethod` in `RouteDef` trait?

```scala
sealed trait RouteDef[Self] {
  def withMethod(method: Method): Self
}
```

Now, in every `RouteDefN` we can write:

```scala
case class RouteDef0(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef0] {
  def withMethod(method: Method) = RouteDef0(method, elems)
}

case class RouteDef1(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef1]{
  def withMethod(method: Method) = RouteDef1(method, elems)
}

case class RouteDef2(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef2]{
  def withMethod(method: Method) = RouteDef2(method, elems)
}
```

and method `on` will return correct type.

(NOTE: Scala provides `copy` method for `case class`es, but it's not defined in any interface and in this case is pretty useless.")

To sum up, we finished with:

```scala
someRouteDef to Application.show
```

As I said I want compiler to check number of arguments with path parameters.
I can now introduce the really crazy classes, welcome `RouteN`.

```scala
sealed trait Route[RD] {
  def routeDef: RouteDef[RD]
}

case class Route0(routeDef: RouteDef0, f0: () ⇒ Out) extends Route[RouteDef0]
case class Route1[A: PathParam : Manifest](routeDef: RouteDef1, f1: (A) ⇒ Out) extends Route[RouteDef1]
case class Route2[A: PathParam : Manifest, B: PathParam : Manifest](routeDef: RouteDef2, f2: (A, B) ⇒ Out) extends Route[RouteDef2]
```

(Like, w00t?)

Yeah, types, types and even more types.
`Route0` takes `RouteDef0` and function `() ⇒ Out` that has no parameters - simple.
`Route1` takes `RouteDef1` and function `(A) ⇒ Out`, so `A` must be type parameter here.
This syntax:

```scala
[A: PathParam : Manifest]
```

is just shortcut for

```scala
[A](implicit pp: PathParam[A], mf: Manifest[A])
```

Both `PathParam[A]` and `Manifest[A]` will be described a bit later (They **will** be, I promise)

By the way, as you probably already know `Route2` takes `RouteDef2` and function `(A,B) ⇒ Out`, so `A` and `B` must be type parameters here.

Back to the `RouteDef`s

```scala
case class RouteDef0(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef0] {
  def to(f0: () ⇒ Out) = Route0(this, f0)
}

case class RouteDef1(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef1]{
  def to[A: PathParam : Manifest](f1: (A) ⇒ Out) = Route1(this, f1)
}

case class RouteDef2(method: Method, elems: List[PathElem]) extends RouteDef[RouteDef2]{
  def to[A: PathParam : Manifest, B: PathParam : Manifest](f2: (A, B) ⇒ Out) = Route2(this, f2)
}
```

Here is where all compile time checks happen. Depending on `RouteDefN`, the `to` method can take only function with correct arity.
And since `RouteN` needs some implicit parameters we have to pass them throught `to` method.

Here is the nice thing about all those types - we can simply add `def apply` to `RouteN` that will require correct number of arguments with correct types!

```scala
case class Route1[A: PathParam : Manifest](routeDef: RouteDef1, f2: (A) ⇒ Out) extends Route[RouteDef1] {
  def apply(a: A) = PathMatcher1(routeDef.elems)(a)
}

case class Route2[A: PathParam : Manifest, B: PathParam : Manifest](routeDef: RouteDef2, f2: (A, B) ⇒ Out) extends Route[RouteDef2] {
  def apply(a: A, b: B) = PathMatcher2(routeDef.elems)(a, b)
}
```

so, if we have route like:

```scala
val foo = GET on "foo" / * to Application.show
```

here `foo` is `Route1[Int](RouteDef1(GET, Static("foo") :: * :: Nil), Application.show)`
and in the same time `foo` is `(Int) ⇒ String`

You see, typing == pure profit!

About `PathMatcherN` - this is yet another arity based stuff used to match request uri to correct route. Since I wanted to focus on DSL/user-side implementation I will not describe it in this post. Let's say that it is a function responsible for parsing/constructing urls.)

Only one thing left. Since all routes are type safe we need a type safe way to match paths to actions.
The one way is to hardcode common types like `Int` or `String`, but that would be stupid. We already have
type-aware routes, with incredibly powerful Scala's type system, why not use it to make something even more awesome?

What do we really need?

* a way to parse path part (String) to our type
* a way to convert path argument to String for reverse routing


That makes sense, but how to apply that to our router and how to make it extensible?

Type classes!

```scala
trait PathParam[T]{
  def apply(t: T): String
  def unapply(s: String): Option[T]
}
```

Here we define trait that provides two methods. `apply` is for converting `T` into `String`, and `unapply` is to parse `String`
into our type `T`. Since parsing can fail it has return type of `Option[T]`

Two simple examples:

```scala
implicit val StringPathParam: PathParam[String] = new PathParam[String] {
  def apply(s: String) = s
  def unapply(s: String) = Some(s)
}

implicit val BooleanPathParam: PathParam[Boolean] = new PathParam[Boolean] {
  def apply(b: Boolean) = b.toString
  def unapply(s: String) = s.toLowerCase match {
    case "1" | "true" | "yes" ⇒ Some(true)
    case "0" | "false" | "no" ⇒ Some(false)
    case _ ⇒ None
  }
}
```

Having all that, it is easy to use custom types as action arguments!

And this is the mystery about `PathParam[A]` in `RouteN` class definitions. Route classes just need to be aware of `PathParam` typeclass, so creating route for some type that does not have `PathParam` type class is forbidden by compiler.

`Manifest[A]` is special typeclass provided by Scala compiler for every type to provide type information at runtime. In play-navigator it is used to display list of routes with it's types (the "route not found" page).

Another (not included in play-navigator) might-be-useful example with `java.util.UUID`:

```scala
implicit val UUIDPathParam: PathParam[UUID] = new PathParam[UUID] {
  def apply(uuid: UUID) = uuid.toString
  def unapply(s: String) = try {
    Some(UUID.fromString(s))
  } catch {
    case _ ⇒ None
  }
}
```

And that's all for now, let's check the requirements list:


* staticly compiled - check
* staticly typed - check, all types are preserved
* easy to use - check, take a look at user side api, it's really easy
* extensible - check, you can use your own types and use any Scala code to generate routes
* it should provide reverse router - check, all routes are functions
* use type inference as much as possible - check, no explicit type parameters on user-side
* do not use much parentheses - check, it requires no parentheses


All green!

There are many other aspects of play-navigator that are not covered in this simple-yet-quite-long tutorial. If you think any part is missing some explanation or is wrong/could be made better feel free to contact me via [twitter (@iteamon)](http://twitter.com/iteamon), teamon on [#scala @ irc.freenode.net](irc://irc.freenode.net/#scala) or in comments below.

You can see all the usage possibilities in [README](http://teamon.github.com/play-navigator).
Also the rest of implementation details such as path parsing, namespaces, integration with play etc is
availible at [github](http://github.com/teamon/play-navigator).


## Disclaimer for `HList` entusiasts


I tried, didn't work as nice as I expected.
The goal was to make end user api as simple as possible and with near to zero explicit type parameters.
