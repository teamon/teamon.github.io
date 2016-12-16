---
title: How to make Rails, Grape and Her work together (with caching!)
source: Monterail Blog
source_url: http://monterail.com/blog/2014/how-to-make-rails-grape-and-her-work-together-with-caching/
---

If you follow our series on building APIs with Grape and Rails, [you already know how to create powerful versioned APIs](http://codetunes.com/2014/introduction-to-building-apis-with-grape/) in a simple and straightforward way as well as [improve Grape’s abilities with a number of useful tricks](http://codetunes.com/2014/grape-part-II/).

Building an interface, however, is often just the first step. The real challenge begins when your application needs to rely on data from several different APIs. It’s particularly difficult when you build applications using the Service Oriented Architecture pattern, which demands a scalable way for the software to communicate between various components.

If you want to know how to solve this problem, then this post is for you.

## Dictionary

We’ll mainly use two gems: `her` and `faraday`.

[Faraday](https://github.com/lostisland/faraday) is an HTTP client lib that provides a common interface over many adapters.

[her](http://her-rb.org/), on the other hand, is an ORM that maps REST resources to Ruby objects, designed to build applications powered by a RESTful API instead of a database. Simply put, her makes REST resources behave like Active Record models:

```ruby
class User
  include Her::Model
end

User.all
# GET "https://api.example.com/users" and return an array of User objects

@user = User.create(fullname: "Tobias Fünke")
# POST "https://api.example.com/users" with `fullname=Tobias+Fünke` and return the saved User object
```

Pretty cool, right? Now let’s get straight to the point.

## Goal

Our objective is to make a Her-based wrapper with a configurable Faraday connection for a multi-host, token-authorized RESTful JSON API that supports HTTP headers cache. Easy-peasy, right? Right...? Well, it's not quite that simple.

Here at [Monterail](http://monterail.com), however, we’ve written a number of Her-based wrappers and have found a nice, elastic pattern that we're eager to share with you.

## Solution

First, let’s have a look at the model classes inside an imaginary `monterail-api` gem. The purpose of these classes is to map resources from other APIs to our own application.

Please note the `uses_api` method; it’s pretty important.

```ruby
# lib/monterail-api/models.rb
module MonterailApi
  module V1
    class Hussar
      include Her::Model
      uses_api MonterailApi::V1.api    # Here

      attributes :name, :skills
    end

    class Wing
      include Her::Model
      uses_api MonterailApi::V1.api    # And here

      attributes :side
    end
  end
end
```

`uses_api` enables our models to talk to different APIs. It changes which API they will use to make their HTTP requests.

The only remaining task is to configure our wrapper in the client application:

```ruby
# lib/monterail-api.rb
module MonterailApi
  module V1
    class ClientNotConfigured < Exception; end

    def self.configure(host, api_key, &block)
      @api = Her::API.new

      @api.setup :url => "http://#{host}/api/v1" do |c|
        # we love JSON, we really do
        c.use FaradayMiddleware::EncodeJson
        c.use Her::Middleware::AcceptJSON
        c.use Her::Middleware::FirstLevelParseJSON

        # simple header based authorizaiton
        c.authorization :token, api_key

        # allow for customizing faraday connection
        yield c if block_given?

        # inject default adapter unless in test mode
        c.adapter Faraday.default_adapter unless c.builder.handlers.include?(Faraday::Adapter::Test)
      end

      # This is very important. Due to way Her currently works
      # model files need to be required after configuring the API
      require "hussars/models"
    end

    def self.api
      # raise exception if somehow model classes gets required
      # before the API is configured
      raise ClientNotConfigured.new("Monterail") unless @api
      @api
    end
  end
end
```

## Faraday and middleware

The great thing about this type of module is that it can be easily integrated with any app. This adaptability doesn’t mean that we can’t improve upon it, though. What about caching? We surely don’t want to slow down the backend by making too many useless HTTP requests, right?

Let’s take advantage of the [faraday-http-cache](https://github.com/plataformatec/faraday-http-cache) and [faraday_middleware](https://github.com/lostisland/faraday_middleware) gems for some `ActiveSupport::Instrumentation` integration.

```ruby
# config/initializers/monterail_api.rb
MonterailApi::V1.configure("some.host.com", "secret") do |c|
  # let the magic happen - this will make use of ETag to skip unneed API calls
  c.use :http_cache, Rails.cache, :logger => Rails.logger

  # Active Support instrumentation
  c.use :instrumentation, :name => "external.monterail.v1"
end
```

Now we can simply use the code below to get the correct object without worrying about hitting the API too often:

```ruby
MonterailApi::V1::Hussar.find(123) # It’s all cached!
```

## That’s it!

This article on building her models and caching them is our third in a series on building APIs. We’ve previously published [an introduction to using `grape`](http://codetunes.com/2014/introduction-to-building-apis-with-grape/), a great gem that allows you to build APIs with tremendous ease. We expanded on that topic in the subsequent post by outlining some [useful tips and tricks for improving `grape`](http://codetunes.com/2014/grape-part-II/). So what’s next? Well, we promised to talk more about data representers, so you’ll just have to wait and see!

We’re always keen to know what you think about the solutions that we provide here on Codetunes. Did you find this introduction to Grape useful? Has it changed the way that you think about APIs in Rails applications? (If so, we’re extremely happy, because that’s why we’re publishing this series.) Or maybe you’re convinced that you can figure out a better solution than ours? If so, prove it!

We’d love to hear your feedback.
