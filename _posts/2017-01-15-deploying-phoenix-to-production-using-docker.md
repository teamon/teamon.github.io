---
title: Deploying Phoenix to production using Docker
---

This is a short tutorial on how we at [Recruitee](http://recruitee.com) are running Phoenix
and other Elixir applications with Docker. On production.

## Why would you want to do this?

The main reason for choosing Docker was the unification of deployment.
We are using many different technologies ranging from Ruby/Rails, Elixir/Phoenix to Java, Python or even PHP.
Simply put, we want to use the best tool for the job, and while we would love to use only a single language/platform
(Elixir/BEAM) for everything it just isn't possible.

With Docker containers we can have a single deployment mechanism no matter what technologies are used inside.

## How to Docker in the real world

The Docker's promise is that with a single `Dockerfile` you will be able to build a runnable image
that you can put straight into production. While this statement is true, the "runnable image" part is not enough.
With the standard approach you will end up with huge images containing all compile-time dependencies
that are not necessary at all in runtime.

That's why we decided to use a two-step process - we separate building the app (compiling, making a release)
from running it.

The next part takes Elixir as an example, but we apply the same principles to all our images.
(For example, the runtime container with JavaScript client app has only compiled code without unnecessary npm dependencies).


## Putting Phoenix app inside Docker image

As mentioned before, building a Docker image is a two-step process:

1. Build phase
    1. Install Erlang
    2. Install Elixir
    3. Run `mix deps.get`
    5. Run `mix release`
    6. Save myapp.tar.gz release package


2. Release phase
    1. Install Erlang
    2. Extract myapp.tar.gz release package from build phase inside container
    3. Done!

Since we use the same process for all our elixir apps, we've made a simple package that does all of the above
in just a few mix commands - [mix_docker](https://github.com/recruitee/mix_docker).

## Introducing [mix_docker](https://github.com/recruitee/mix_docker)

mix_docker provides a handful of mix commands to make putting elixir apps inside Docker images as simple and repeatable
as possible.
It is based on [Paul Schoenfelder's](http://bitwalker.org/) excellent
[distillery](https://github.com/bitwalker/distillery) package and
[alpine-erlang](https://hub.docker.com/r/bitwalker/alpine-erlang/) lightweight Docker image.


Here are six steps from zero to a ready Docker image.


1\. Add "mix_docker" to `mix.exs`:

```elixir
def deps do
  [{:mix_docker, "~> 0.2.2"}]
end
```

2\. Configure image name in `config/config.exs`:

```elixir
config :mix_docker, image: "teamon/demo"
```

3\. Initialize release configuration:

```bash
mix docker.init
```

This will run distillery init and create a `rel/config.exs` file.
We do not need to change it - the default values are ready for Docker out of the box.

4\. Build the release:

```bash
mix docker.build
```

This will create the `teamon/demo:build` image with `demo.tar.gz` release package inside.


5\. Build the minimal release image:

```bash
mix docker.release
```

This will extract `demo.tar.gz` and put it in a minimal Docker image ready to be run in production.
These images are typically few times smaller than the build ones.


6\. Finally we can publish our release image into Docker Hub

```
mix docker.publish
```

This will tag the release image with current version based on app version in mix.exs,
current git commit count and git sha, e.g. `0.1.0.253-158c4a45c1`.
The full image name will be `teamon/demo:0.1.0.253-158c4a45c1`.

There is also a shortcut command `mix docker.shipit` that will run build, release and publish.


## Configuring dockerized applications

Since production releases do not contain Mix, the easiest way to provide runtime configuration is to use ENV variables.
The default Docker images provided by mix_docker contain `REPLACE_OS_VARS=true`, so all you need to do is to prepare
`config/prod.exs` in the following way:

```elixir
config :demo, Demo.Endpoint,
  server: true,
  # use {:system, var} if library supports it
  http: [port: {:system, "PORT"}],  
  # use ${VAR} syntax to replace config on startup
  url: [ host: "${APP_DOMAIN}" ]    

config :demo, Demo.Mailer,
  adapter: Bamboo.MailgunAdapter,
  api_key: "${MAILGUN_API_KEY}"
```

You can read more about [runtime configuration in distillery](https://hexdocs.pm/distillery/runtime-configuration.html) docs.

Remember to rebuild you image after changing the config!

## Running the app

Now we are ready to run the app like any other Docker container.

```bash
docker run -e PORT=4000 teamon/demo:0.1.0.253-158c4a45c1 foreground
```

## Using remote console

Since docker containers are self-contained in order to connect to running node using remote_console
you need to exec into running container:

```bash
docker exec -it CID /opt/app/bin/demo remote_console
```

## That's it!

One of the implicit benefits of using ENV variables to configure application in runtime is that
we are able to use the exact same image to both staging and production
(changing only domains, api keys, etc.) which gives us much more confidence when deploying to production.

In the [upcoming post](/2017/setting-up-elixir-cluster-using-docker-and-rancher/)
I'll go through deploying these Docker containers with Rancher and connecting multiple instances
into single Erlang cluster.
