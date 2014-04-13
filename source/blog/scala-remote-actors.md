---
author: Tymon Tobolski
date: 2010-10-07
title: "Scala remote actors"
tags: scala
source: tumblr
source_url: http://tumblr.teamon.eu/post/1262975706/scala-remote-actors
---


### Server
```scala
import scala.actors.Actor
import scala.actors.Actor._
import scala.actors.remote.RemoteActor
import scala.actors.remote.RemoteActor._

object Server {
  def main(args: Array[String]) : Unit = {
    if (args.length == 1) {
      val port = args(0).toInt
      val server = new Server(port)
      server.start()
    }
    else {
      println("usage: scala Server [LocalPort]")
    }
  }
}

class Server(port: Int) extends Actor {
  RemoteActor.classLoader = getClass().getClassLoader()
  def act() {
    alive(port)
    register('RemoteActor, self)

    while (true) {
      receive {
        case msg =>
          println(msg)
      }
    }
  }
}
```

### Client
```scala
import scala.actors.Actor
import scala.actors.remote.RemoteActor
import scala.actors.remote.RemoteActor._
import scala.actors.remote.Node

object Client {
  def main(args: Array[String]) : Unit = {
    if (args.length >= 2) {
      val remoteport = args(1).toInt
      val peer = Node(args(0), remoteport)
      val msg = if(args.length >= 3) args(2) else "Hello"
      val client = new Client(peer, msg)
      client.start
    }
    else {
      println("usage: scala Client [RemoteHostName] [RemotePort] [Message = Hello]")
    }
  }
}

class Client(peer: Node, message: String) extends Actor {
  def act() {
    RemoteActor.classLoader = getClass().getClassLoader()
    val server = select(peer, 'RemoteActor)
    link(server)

    while (true) {
      server ! message
      Thread sleep 1000
    }
  }
}
```
