---
author: Tymon Tobolski
date: 2010-08-03
title: Better (scoped) rails engines routing
tags: ruby, rails
source: tumblr
source_url: http://tumblr.teamon.eu/post/898063470/better-scoped-rails-engines-routing
---

Rails engines are really great, but they are missing one thing - putting in router scope. Fortunately, this can be easily fixed.

Instead of engine's `config/routes.rb` file put all router stuff in `lib/engine.rb` like that:

```ruby
# my_engine/lib/engine.rb

require "my_engine"
require "rails"

module MyEngine
  class Engine < Rails::Engine
  end

  module Routes
    def self.draw(map)
      map.instance_exec do
        match "/my_engine", :to => "my_engine#foo"
      end
    end
  end
end
```

```ruby
# my_app/config/routes.rb

MyApp::Application.routes.draw do
  MyEngine::Routes.draw(self)
end
```

```bash
$ rake routes
my_engine  /my_engine {:controller=>"my_engine", :action=>"foo"}
```

And now it is possible to add scope:

```ruby
# my_engine/lib/engine.rb

require "my_engine"
require "rails"

module MyEngine
  class Engine < Rails::Engine
  end

  module Routes
    def self.draw(map)
      map.instance_exec do
        match "/my_engine", :to => "my_engine#foo"
      end
    end
  end
end
```

```ruby
# my_app/config/routes.rb

MyApp::Application.routes.draw do
  scope "bar" do
    MyEngine::Routes.draw(self)
  end
end
```

```bash
$ rake routes
bar_my_engine  /bar/my_engine {:controller=>"my_engine", :action=>"foo"}
```

Done! [Example gist](https://gist.github.com/teamon/506390)
