---
title: Event sourcing on Rails with RabbitMQ
source: Monterail Blog
source_url: http://codetunes.com/2014/event-sourcing-on-rails-with-rabbitmq/
---

A year ago [I wrote about](http://codetunes.com/2013/robust-dashboard-application-with-faye/) one of our dashboard applications and how we solved performance issues using Faye delayed messaging ([now available as gem!](https://github.com/monterail/faye-redis-delayed)).

From the very beginning we started with [Service Oriented Architecure](http://en.wikipedia.org/wiki/Service-oriented_architecture), which turned out to be the best decision we ever made. Each application in the suite (there are 8 of them at the time of writing) is responsible for only one part of the business process. Then there is a dashboard that shows the user the most important information from all other apps.

Unfortunately, this is not everything. One of the most valuable features of this project is its ability to import/export data between applications. What's more, it requires both write and read interfaces between applications -- instead of [star](http://en.wikipedia.org/wiki/Star_network) we have to deal with [mesh](http://en.wikipedia.org/wiki/Mesh_networking).

The concurrent growth of features and users in the ecosystem has led to a number of performance issues. All the connections between applications were made using HTTP APIs in an "ask for X" manner and the suite started to become very sluggish.

We went through a thought process to redesign the architecture and reduce the dependencies, but since the core functionality of each application is separate and well-defined, there really wasn't much that we could do to improve it. What's more, we found that in the future it could be worthwhile to extract some functionality into new separate applications.

The obvious answer was this:

> Let's just toss in HTTP cache and it'll be fine

It wasn't.

The biggest problem we had with HTTP cache is `max-age`.

There are two basic use cases in the system:
- User performs some action, goes to another application and wants to see updated data
- User goes to her dashboard and wants to see the current status of data (which might not have changed for days)

It is impossible to find a perfect number of seconds for how long the resource should be cached. If the time duration is too low there will be too many HTTP requests even if the data hasn't changed. If it is too high we will get loads of emails from users informing us that the system is not working since they will be presented with outdated information.

The whole point of caching is to improve performance, not spoil the experience.

So what **can** we do?

The answer is: **Revert the architecture**


## Message passing to the rescue

Object-Oriented Programming principles encourage [Tell, Don't Ask](http://robots.thoughtbot.com/tell-dont-ask) pattern. If we take it to the higher, architectural level, the solution makes itself.

Instead of the consumer **asking** the producer for a resource each time, let's make the producer **tell** the consumer about changes.

Enough storytelling; it's time to get our hands dirty and replace old-school HTTP APIs with awesome RabbitMQ messaging.

## What is RabbitMQ?

 [RabbitMQ](https://www.rabbitmq.com) is an Open Source message broker / queueing system written in Erlang implementing [AMQP](http://en.wikipedia.org/wiki/Advanced_Message_Queuing_Protocol). Their tag line states:

 > Messaging that just works

and I've found this to really be true.

To get an overview of what can be achieved using RabbitMQ see [example topologies diagrams](https://www.rabbitmq.com/getstarted.html).

We will be using [Pub-Sub topology](https://www.rabbitmq.com/tutorials/tutorial-three-ruby.html) with multiple fanout exchanges and queues.


## Setting up RabbitMQ

This part depends on your operating system. There are number of [guides](https://www.rabbitmq.com/download.html) on the RabbitMQ website.

If you happen to use Mac OS X and have [Homebrew](http://brew.sh/) installed all you need to do is run

```bash
brew install rabbitmq
```

and then start it with

```bash
/usr/local/opt/rabbitmq/sbin/rabbitmq-server
```

After starting `rabbitmq-server` you can access the Admin UI at [http://localhost:15672](http://localhost:15672). The default user is `guest` with password `guest`. The Admin UI is extremely useful when working with and debugging RabbitMQ. We'll explore some of this in the following sections.


## Simple architecture: Dashboard for a blog

Let's imagine two applications: a typical Blog application with posts and a Dashboard application that displays 5 recently created posts. Instead of building an HTTP API in Blog so that Dashboard could `ask` for recent posts we will make Blog `tell` about each new post.

![Blog -> Dashboard](http://codetunes.s3.amazonaws.com/posts/event_sourcing_diagram.png)

In the diagram above there is:

- `Blog` - a typical rails app backed by SQL database
- `P` - RabbitMQ Producer
- `X` - RabbitMQ Exchange
- `Queue` - RabbitMQ Queue
- `C` - RabbitMQ Consumer
- `Dashboard` - rails app backed by Redis

After a post is created in Blog application it will go to Producer which will then send a message to Exchange. Exchange will put the message into a Queue. Then the Consumer, connected to this Queue, will grab the message and update Dashboard's Redis-based cache.

This may sound a little complicated, but thanks to great ruby libraries you will notice that there is not too much work to do.

## Blog post Publisher

First we need to create a basic scaffold for posts

```bash
rails new blog
cd blog
bundle
rails generate scaffold post title:string body:text
rake db:migrate
rails server
```

The interface for managing posts should be now available at [http://localhost:3000/posts](http://localhost:3000/posts)

Now we need to create a RabbitMQ Producer. Let's call it Publisher. We will be using [bunny](http://rubybunny.info/) - "A dead easy to use RabbitMQ Ruby client".

Let's put that into `Gemfile`

```ruby
# blog/Gemfile
gem "bunny"
```

and run `bundle install`.

Now it's time to implement our Publisher.

```ruby
# blog/app/services/publisher.rb
class Publisher
  # In order to publish message we need a exchange name.
  # Note that RabbitMQ does not care about the payload -
  # we will be using JSON-encoded strings
  def self.publish(exchange, message = {})
    # grab the fanout exchange
    x = channel.fanout("blog.#{exchange}")
    # and simply publish message
    x.publish(message.to_json)
  end

  def self.channel
    @channel ||= connection.create_channel
  end

  # We are using default settings here
  # The `Bunny.new(...)` is a place to
  # put any specific RabbitMQ settings
  # like host or port
  def self.connection
    @connection ||= Bunny.new.tap do |c|
      c.start
    end
  end
end
```

Now we need to call `Publisher.publish` every time a new `Post` is created:

```ruby
# blog/app/controllers/posts_controller.rb
class PostsController < ApplicationController
  # ...

  def create
    @post = Post.new(post_params)

    if @post.save
      # Publish post data
      Publisher.publish("posts", @post.attributes)

      redirect_to @post, notice: 'Post was successfully created.'
    else
      render :new
    end
  end

  # ...
end
```

That's it!

Remember to restart rails server before continuing.

You can now create a new post, then go to [RabbitMQ Admin UI](http://localhost:15672), select "Exchanges", then `blog.posts` and you should see something like this:

![blog.posts exchange](http://codetunes.s3.amazonaws.com/posts/event_sourcing_bindings.png)

When you scroll down the page you'll notice that there is no binding for this exchange.

![blog.posts exchange bindings](http://codetunes.s3.amazonaws.com/posts/event_sourcing_no_bindings.png)

This basically means that messages sent to this exchange are not going anywhere.

Now it's time to setup a queue between the exchange and Dashboard applications and the consumer that will update local cache.

> **Note on durability**
>
> [RabbitMQ Pub/Sub tutorial](https://www.rabbitmq.com/tutorials/tutorial-three-ruby.html) uses on-demand random queues created when client connects to the server. This is good for some use cases, but not ours.
> In case the Dashboard applications goes down (for any reason) the temporary queue would be deleted and messages sent from Blog will never reach Dashboard. That's why we need a static, durable queue that will hold messages in case Dashboard consumer disconnects and deliver every message after reconnecting.

## Dashboard Consumer

If you are familiar with tools like [Sidekiq](http://sidekiq.org/) or [Resque](https://github.com/resque/resque) this part will feel like home.

There is another great RabbitMQ ruby library made especially for processing messages that come from queues. It's called [sneakers](http://jondot.github.io/sneakers/) and was created by [@jondot](https://twitter.com/jondot). (You should definitely check out [his blog](http://blog.paracode.com/)!)

Let's start with creating new rails app

```bash
rails new dashboard
cd dashboard
```

add some gems

```ruby
# dashboard/Gemfile
gem 'redis-rails'
gem 'redis-namespace'
gem 'sneakers'
```

and run `bundle install`.

Both redis and sneakers require [some setup](https://github.com/jondot/sneakers/wiki/How-To:-Rails-Background-Jobs)

## Redis setup

```ruby
# dashboard/config/initializers/redis.rb
$redis = Redis::Namespace.new("dashboard:#{Rails.env}", redis: Redis.new)
```

## Sneakers setup

```ruby
# dashboard/Rakefile

# load sneakers tasks
require 'sneakers/tasks'

Rails.application.load_tasks
```

```ruby
# dashboard/config/initializers/sneakers.rb
Sneakers.configure({})
Sneakers.logger.level = Logger::INFO # the default DEBUG is too noisy
```

## Recent Posts service

Since we are not using ActiveRecord, we need some place to put functionality related to recent posts. Let's make a service called `RecentPosts`.

```ruby
# app/services/recent_posts.rb
class RecentPosts
  KEY = "recent_posts" # redis key
  STORE_LIMIT = 5      # how many posts should be kept

  # Get list of recent posts from redis
  # Since redis stores data in binary text format
  # we need to parse each list item as JSON
  def self.list(limit = STORE_LIMIT)
    $redis.lrange(KEY, 0, limit-1).map do |raw_post|
      JSON.parse(raw_post).with_indifferent_access
    end
  end

  # Push new post to list and trim it's size
  # to limit required storage space
  # `raw_post` is already a JSON string
  # so there is no need to encode it as JSON
  def self.push(raw_post)
    $redis.lpush(KEY, raw_post)
    $redis.ltrim(KEY, 0, STORE_LIMIT-1)
  end
end
```

## Dashboard view

Dashboard application needs to have some view so we can see if it works correctly.

```ruby
# dashboard/app/controllers/home_controller.rb
class HomeController < ApplicationController
  def index
    @posts = RecentPosts.list
  end
end
```

```erb
# dashboard/app/views/home/index.html.erb
<h2>Recently updated posts</h2>

<table>
  <thead>
    <tr>
      <th>Title</th>
    </tr>
  </thead>

  <tbody>
    <% @posts.each do |post| %>
      <tr>
        <td><%= post[:title] %></td>
      </tr>
    <% end %>
  </tbody>
</table>
```

```ruby
# dashboard/config/routes.rb
Rails.application.routes.draw do
  root to: "home#index"
end
```

## Worker

Finally, the sneakers worker. You'll probably notice that it looks very similar to sidekiq workers.

```ruby
# dashboard/app/workers/posts_worker.rb
class PostsWorker
  include Sneakers::Worker
  # This worker will connect to "dashboard.posts" queue
  # env is set to nil since by default the actuall queue name would be
  # "dashboard.posts_development"
  from_queue "dashboard.posts", env: nil

  # work method receives message payload in raw format
  # in our case it is JSON encoded string
  # which we can pass to RecentPosts service without
  # changes
  def work(raw_post)
    RecentPosts.push(raw_post)
    ack! # we need to let queue know that message was received
  end
end
```

That's it, the Dashboard app is ready!

In order to start workers run:

```bash
WORKERS=PostsWorker rake sneakers:run
```

In [RabbitMQ Admin UI](http://localhost:15672) you can see that the `dashboard.posts` queue was created - navigate to "Queues" -> `dashboard.posts`.

![dashboard.posts queue](http://codetunes.s3.amazonaws.com/posts/event_sourcing_queue.png)

Now, if you create a new post in Blog app the message will go to `blog.posts` exchange but the `dashboard.posts` queue will still be empty. Why? We need to setup a binding between exchange and queue.


## Putting it all together

We need to tell `blog.posts` exchange to send incoming messages to `dashboard.posts` queue. This could be done in RabbitMQ Admin UI, but it's much better to have this binding as declarative configuration that can be automatically executed (e.g. during deploy).

We will use the same bunny library as we used for publishing messages in Blog application.

```ruby
# config/Rakefile
namespace :rabbitmq do
  desc "Setup routing"
  task :setup do
    require "bunny"

    conn = Bunny.new
    conn.start

    ch = conn.create_channel

    # get or create exchange
    x = ch.fanout("blog.posts")

    # get or create queue (note the durable setting)
    queue = ch.queue("dashboard.posts", durable: true)

    # bind queue to exchange
    queue.bind("blog.posts")

    conn.close
  end
end
```

Now all we need to do is run:

```bash
rake rabbitmq:setup
```

Let's inspect `blog.posts` exchange bindings in [RabbitMQ Admin UI](http://localhost:15672).

![blog.posts exchange bindings](http://codetunes.s3.amazonaws.com/posts/event_sourcing_bind.png)

Now every `Post` created will be published as a message that goes to `blog.posts` exchange, is routed to `dashboard.posts` queue, is taken by `PostsWorker`, and is put into redis by `RecentPosts` service.

## Complex architectures

The previous example shows how you can connect two applications. In the real world, however, the connections are much more complicated.

Consider the following diagram

![complex architecture](https://camo.githubusercontent.com/8f3bd729bc90b6e877390d23d4976f44ec9f8da5/68747470733a2f2f646c2e64726f70626f7875736572636f6e74656e742e636f6d2f732f3676716d30773037736b68393036732f323031342d30352d3138253230617425323030332e32372e706e67)

Here are some differences from the previous example:

- `Blog` now publishes many messages to many exchanges
- `Dashboard` consumes messages from many queues
- `Admin` - another application that is both a producer and consumer
- Exchange ↔ Queue binding is much more complicated - it can be either one to many (`blog.posts`) or many to one (`*.page_views`)
- `Admin` is a consumer backed by SQL instead of redis


Let's go through some of those points

## Cache storage

Choosing the appropriate storage for our cache is a very broad topic. I'm going to stick with just a few examples that will give you an overview.

## Recent posts

On our Dashboard, we are only interested in the last five posts. This is a perfect use case for redis list. We atomically push new items to the front of the list using `LPUSH`, we always fetch the first few items using `LRANGE`, and we can easily limit the storage using `LTRIM`. There is no need to do any sorting or filtering. Redis gives us everything that we need and nothing more.

## Page views statistics

Another good use case for redis backend is gathering page views statistics. Using redis `INCR`, `INCRBY` or `HINCR` it is easy to atomically increment counters without having to worry about race conditions. You can see an example of this at [PageViews service](https://github.com/monterail/rails-event-sourcing-example/blob/master/dashboard/app/services/page_views.rb).


## Structured cache with filtering and sorting

Of course redis in not a silver bullet. There might be a case when you need the ability to filter or sort cached records. In such a case, we can create a regular SQL database model and store required information in it. See an example of storing blog posts in Admin app using [Blog::Post](https://github.com/monterail/rails-event-sourcing-example/blob/master/admin/db/schema.rb#L16) model and [Blog::PostsWorker](https://github.com/monterail/rails-event-sourcing-example/blob/master/admin/app/workers/blog/posts_worker.rb)



## Exchange ↔ Queue bindings

Complex architectures will require more complex bindings. Fortunately, this can be solved in the same way as the previous example.

All we need to do is modify the setup task:

```ruby
# config/Rakefile
namespace :rabbitmq do
  desc "Setup routing"
  task :setup do
    require "bunny"

    conn = Bunny.new
    conn.start

    ch = conn.create_channel

    # connect one exchange to multiple queues
    x = ch.fanout("blog.posts")
    ch.queue("dashboard.posts", durable: true).bind("blog.posts")
    ch.queue("admin.posts", durable: true).bind("blog.posts")

    # connect mutliple exchanges to the same queue
    x = ch.fanout("admin.page_views")
    ch.queue("dashboard.page_views", durable: true).bind("admin.page_views")

    x = ch.fanout("blog.page_views")
    ch.queue("dashboard.page_views", durable: true).bind("blog.page_views")

    conn.close
  end
end
```


## Final notes

RabbitMQ has enormous potential for dealing with a complex Service-Oriented system. Using durable queues allows us to maintain data consistency even if one part of the system breaks. For Dashboard-like applications, users can still access cached data even if the underlying application goes down.

On-change message passing gives a significant performance boost when compared to continuous API calls. It is a win in terms of speed, durability and availability. Theoretically we give up some temporary consistency and real-time data updates. On most occasions, however, we've found that when a user moves between applications the cache is already updated and the recent data is already available.

A working example of complex architecture is available at [our GitHub](https://github.com/monterail/rails-event-sourcing-example).
