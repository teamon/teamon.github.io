---
author: Tymon Tobolski
title: Introduction to building APIs with Grape
date: 2014-01-15 11:45 UTC
tags: rails, api, http, cache, spa
source: codetunes
source_url: http://codetunes.com/2014/introduction-to-building-apis-with-grape/
---
As [we at Monterail are no longer just a Rails shop](http://codetunes.com/2013/we-re-angularjs-developers/), our projects have grown in size presenting us with an array of new challenges. All the Single Page Applications we code need reliable APIs versioning to work properly. Some of the bigger apps that we manage, built with Service Oriented Architecture pattern, demand a scalable way for our software to communicate between various components.

New challenges demand new solutions — we’d like to share one with you that has worked well for us.

You might think that it's difficult to code APIs that are simple to maintain and honestly, we thought so too. However, as some of us have recently discovered, an excellent tool already exists to solve this problem.

It's called [Grape](https://github.com/intridea/Grape).

If you haven't heard of it, Grape is a REST-based framework for building APIs in Ruby that was designed to run on Rack as well as to fit into existing Rails or Sinatra applications. The article below, which is the first of four that we're planning, is a summary of our experiences using Grape for our projects. When we started using Grape there were no clear guidelines for how to get everything up and running, so we had to simplify the process and solve the problem on our own. After getting our hands a little dirty, we came up with the instructions laid out below that show how we think Grape is best approached.

To begin, install Grape as a gem in your application. As you probably suspect, to do so you'll simply need to put this code in your Gemfile:

```ruby
# Gemfile
gem "grape"
```

# Structuring code for API versioning

The goal is simple — we want to have the API version that we need in the path:

```
/api/v1/hussars.json - API version 1
/api/v2/hussars.json - API version 2
```

This is a pretty standard and failsafe way of API versioning and while it is possible to do this with Grape, the solution is not as straightforward as you may think.

We also want to have all API-related codebase under the `API` module, as well as different versions in their own submodules `API::V1` and `API::V2`.

Let's start at the deepest level of the code: the actual "controller":

```ruby
# app/controllers/api/v1/hussars.rb
module API
  module V1
    class Hussars < Grape::API
      version 'v1' # path-based versioning by default
      format :json # We don't like xml anymore

      resource :hussars do
        desc "Return list of hussars"
        get do
          Hussar.all # obviously you never want to call #all here
        end
      end
    end
  end
end
```

The code above shows a very simple Grape resource whose path ends with `/v1/hussars.json`.

Let's assume we have some other resources like these:

- `/v1/wings.json` as `API::V1::Wings` in `app/controllers/api/v1/wings.rb`
- `/v2/hussars.json` as `API::V2::Hussars` in `app/controllers/api/v2/hussars.rb`

Now, for each API version we need an aggregate class that mounts all of its resources:

```ruby
# app/controllers/api/v1/base.rb
module API
  module V1
    class Base < Grape::API
      mount API::V1::Hussars
      mount API::V1::Wings
    end
  end
end
```

The same goes for `app/controllers/api/v2/base.rb`.

We also need one more class that will aggregate all API versions:

```ruby
# app/controllers/api/base.rb
module API
  class Base < Grape::API
    mount API::V1::Base
    mount API::V2::Base
  end
end
```

Finally, we can mount `API::Base` in `routes.rb`.

```ruby
# config/routes.rb
Monterail::Application.routes.draw do
  # ...
  mount API::Base => '/api'
  # ...
end
```

This way we get routing like this:

```
/api/v1/hussars.json  -> API::V1::Hussars
/api/v1/wings.json    -> API::V1::Wings
/api/v2/hussars.json  -> API::V2::Hussars
```

To sum up this section, the file structure should look as follows:

```
app/
  controllers/
    api/
      v1/
        hussars.rb      - API::V1::Hussars
        wings.rb        - API::V1::Wings
        base.rb         - API::V1::Base
      v2/
        hussars.rb      - API::V2::Hussars
        base.rb         - API::V2::Base
      base.rb           - API::Base
```


This may seem like a few too many classes for such a simple case, but as you'll see in the next section, taking this extra step will pay off pretty quickly.


# Reusable components

If you take a closer look at the `API::V1::Hussars` class, you will notice this:

```ruby
version 'v1'
format :json
```

Due to the way Grape works, a variant of this definition needs to be in every class that inherits and defines any resources from `Grape::API`. Having multiple classes in your code, however, can result in code duplication and the possibility of mismatching resources.

The clearest solution is to use a shared module that may look like this:

```ruby
# app/controllers/api/v1/defaults.rb
module API
  module V1
    module Defaults
      # if you're using Grape outside of Rails, you'll have to use Module#included hook
      extend ActiveSupport::Concern

      included do
        # common Grape settings
        version 'v1'
        format :json

        # global handler for simple not found case
        rescue_from ActiveRecord::RecordNotFound do |e|
          error_response(message: e.message, status: 404)
        end

        # global exception handler, used for error notifications
        rescue_from :all do |e|
          if Rails.env.development?
            raise e
          else
            Raven.capture_exception(e)
            error_response(message: "Internal server error", status: 500)
          end
        end

        # HTTP header based authentication
        before do
          error!('Unauthorized', 401) unless headers['Authorization'] == "some token"
        end
      end
    end
  end
end
```

Then simply include the shared module in the resource module:

```ruby
# app/controllers/api/v1/hussars.rb
module API
  module V1
    class Hussars < Grape::API
      include API::V1::Defaults
      # ...
    end
  end
end
```

Think of it as your APIs `application_controller.rb`; all the reusable components should go inside this shared module. At Monterail, we also use this pattern to support different authorization methods for different scopes in the application, a common example being when we deal with admins and casual users.

# Swagger integration

[Swagger](http://swagger.wordnik.com/) is a great way of documenting an API that allows you to produce, visualize, and consume your very own RESTful services. Surprisingly, implementing Swagger only requires some HTML5 and a lot of JavaScript, so you can run it virtually anywhere. Integrating Swagger with Grape will make your workflow easier because your API will be documented completely, right out of the box! How cool is that?

To use Swagger in your Rails application, add `grape-swagger` gem to `Gemfile`:

```ruby
# Gemfile
gem 'grape-swagger'
```

Then add one line to the `API::V1::Base` module:

```ruby
# app/controllers/api/v1/base.rb
module API
  module V1
    class Base < Grape::API
      # ...
      add_swagger_documentation base_path: "/api",
                                api_version: 'v1',
                                hide_documentation_path: true
    end
  end
end
```

Finally, you’ll need to download and configure [Swagger UI](https://github.com/wordnik/swagger-ui). To do this, copy `dist` directory to `public/api/docs`.

To make Swagger UI work with grape-swagger gem we need to put `/api/swagger_doc.json` as `url` in `public/api/docs/index.html` file at line 22:

```javascript
// public/api/docs/index.html
21.      window.swaggerUi = new SwaggerUi({
22.      url: "/api/swagger_doc.json",      // <---- HERE
23.      dom_id: "swagger-ui-container",
```

After you do this you'll be able to visit `http://localhost:3000/api/docs` and test out your API directly from the browser. Feel free to try it anytime; it's a really great way to debug your application.

# Summary

That's it for now, folks.

As you can see, Grape is a tremendously powerful tool that's easy to learn and implement into your workflow, especially when it’s combined with Swagger, ROAR or Her. We want to save some stuff for you to read in future posts though, so we'll hold off on discussing those topics until later. As we mentioned in the introduction, we're going to publish a handful of posts detailing everything that we've learned about Grape. For now, we can tell you that the next post in this series will focus on how you can enhance your API. We’ll follow up that article by taking you on an insightful journey into the world of API caching. So stayed tuned — it’ll be quite a trip!

We're always keen to know what you think about the solutions that we provide here on Codetunes. Did you find this introduction to Grape useful? Has it changed the way that you think about APIs in Rails applications? (If so, we're extremely happy, because that’s why we’re publishing this series.) Or maybe you're convinced that you can figure out a better solution than ours? If so, prove it!

We'd love to hear your feedback.
