---
title: Introducing Tesla — the flexible HTTP client for Elixir
source: Medium
source_url: https://medium.com/@teamon/introducing-tesla-the-flexible-http-client-for-elixir-95b699656d88#.k6mlwqar4
---
After a year and a half year since the first commit it is time to finally write something
about [tesla][1] — the flexible HTTP client library for Elixir.

The story behind it is dead simple - coming from ruby world I was missing the fantastic [faraday][2] equivalent,
so there was no other option than filling the gap. (You probably figured out origins of the name by now.)

## Why another HTTP client library?

There are already some great elixir HTTP clients like [httpotion][3] or [httpoison][4].
Each of them is based on different erlang library, [ibrowse][5] or [hackney][6].
They both allow writing custom API clients providing specific callback to manipulate requests and responses.
Having said that, the most important missing trait for me was the lack of support for composing API clients
from ready-made blocks — **middlewares**. Having a rich, well-tested toolset right at hand is invaluable.
Since besides middleware tesla also supports multiple different adapters we (the elixir community) can implement,
share and reuse common patterns without worrying about underlying low-level details.

## GET /HELLO-WORLD

You can use tesla directly like this:

```elixir
Tesla.get("https://github.com/search", query: [q: "tesla"])
```

## Let's build a GitHub API client

Take a look at the following code snippet:

```elixir
defmodule GitHub do  
  use Tesla

  plug Tesla.Middleware.BaseUrl, "https://api.github.com"
  plug Tesla.Middleware.Headers, %{"User-Agent" => "tesla"}
  plug Tesla.Middleware.JSON

  def user_repos(login) do
    get("/user/" <> login <> "/repos")  
  end
end
```

As you can probably already guess this GitHub API client will hit https://api.github.com with "tesla" User-Agent header.
The request body will be encoded as JSON and response body will be decoded as JSON (if given supported Content-Type).

Now you can use this client as follows to get list of repos for a user:

```elixir
GitHub.user_repos("teamon")
```

## Dynamic API clients

I'm sure you are thinking about dynamic properties like authorization that you will
need to pass around at function arguments. Worry not, tesla got you covered:

```elixir
defmodule GitHub do  
  use Tesla.Builder

  plug Tesla.Middleware.BaseUrl, "https://api.github.com"
  plug Tesla.Middleware.Headers, %{"User-Agent" => "Tesla"}
  plug Tesla.Middleware.JSON

  def new(token) do  
    Tesla.build_client([  
      {Tesla.Middleware.Headers, %{"Authorization" => token}}  
    ])  
  end

  def user_repos(client, login) do  
    get(client, "/user/" <> login <> "/repos")  
  end  
end
```

`Tesla.build_client/1` allows you to create a local client by dynamically inserting middleware (with arguments).
Using that client is then as simple as this:

```elixir
client = GitHub.new(my_token)  
repos = client |> GitHub.user_repos("teamon")
```

## How about middleware?

Every middleware is either a local `function/3` or a module with function `call/3`.
It takes `Tesla.Env` struct with request parameters, the `next` middlewares and some options.

```elixir
defmodule MyMiddleware do  
  def call(env, next, options // []) do  
    env  
    |> do_something_with_request  
    |> Tesla.run(next)  
    |> do_something_with_response  
  end  
end
```

You can choose to do whatever you want. See [built-in middlewares][7] for some examples.

## There is more

At the moment of writing tesla supports three different erlang HTTP adapters: [hackney][6], [ibrowse][5]
and the built-in [httpc][8]. It has some basic middlewares for JSON, logging etc.
If the adapter supports it you can pass a Stream as a request body.

I encourage you to play with it, [write some middleware][9] and submit a pull request — let's build
the best HTTP toolkit one can imagine!

[1]: http://github.com/teamon/tesla
[2]: https://github.com/lostisland/faraday
[3]: https://github.com/myfreeweb/httpotion
[4]: https://github.com/edgurgel/httpoison
[5]: https://github.com/cmullaparthi/ibrowse
[6]: https://github.com/benoitc/hackney
[7]: https://github.com/teamon/tesla/tree/master/lib/tesla/middleware
[8]: http://erlang.org/doc/man/httpc.html
[9]: https://github.com/teamon/tesla#writing-your-own-middleware
