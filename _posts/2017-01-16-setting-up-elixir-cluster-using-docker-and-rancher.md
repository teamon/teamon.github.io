---
title: Setting up Elixir cluster using Docker and Rancher
---
In the [previous](/2017/deploying-phoenix-to-production-using-docker/) post
we went through putting Elixir app inside Docker image.
One downside of running Elixir inside Docker is that since containers have their own network,
even when running on the same physical host, two Elixir nodes inside two separate containers can't connect with
each other by default.

What's more, we are deploying Elixir (and all other) containers using [Rancher](http://rancher.com/) that
distributes containers across multiple physical machines. Because of this, we can't expose ports from Docker
container to host - on ever host there can be zero, one or more containers running the same application.
Fortunately, we can use Rancher's built-in DNS service discovery to automatically discover new nodes and connect
to them.

## How rancher works

One of the basic building blocks of Rancher are services.
Each service is defined as a Docker image plus configuration
(ENV, command, volumes, etc.) and can run multiple identical containers on multiple machines.

To make routing between these containers work Rancher provides it's own overlay network and DNS-based service discovery.

For example, given the service named "my-hello-service" with three containers, running `nslookup` from inside one
of the containers (or a linked container) will give:

```bash
/opt/app $ nslookup my-hello-service
Name:      my-hello-service
Address 1: 10.42.72.199
Address 2: 10.42.96.65
Address 3: 10.42.240.66
```

Since all containers in the same logical service can ping each other via this overlay network we only need to
make each node aware of the others.

## Everything is dynamic

The IP addresses shown above are all dynamic - their lifetime is the same as the container's lifetime.
They will change in case of container restart/upgrade or scaling (adding or removing containers from service).
Because of that we can't use static file configuration using `sys.config`
(described e.g. [in this post](https://dockyard.com/blog/2016/01/28/running-elixir-and-phoenix-projects-on-a-cluster-of-nodes))

Instead we will make our app aware of Rancher DNS and benefit from it as much as possible.

## Configuring Elixir node

But before we get to node discovery we first need to make sure Elixir nodes can see each other.
When using [mix_docker](https://github.com/recruitee/mix_docker) (or in fact [distillery](https://github.com/bitwalker/distillery))
the default node name is set to `appname@127.0.0.1`.
If we want to connect to other nodes in the `10.42.x.x` network we need to change that.
And this setting also needs to be dynamic and set from within a container when it starts
(only then we can be sure about its Rancher network overlay IP address).

I've spent quite some time figuring out how to do this and finally found out a solution.
In a nutshell we need to make `vm.args` aware of ENV variables and then just set those variables on container boot.

**NOTE**: You might want to read [previous post about Elixir & Docker](/2017/deploying-phoenix-to-production-using-docker/)
before continuing.

First, we need to tell distillery to use our own custom `vm.args` file:

```elixir
# rel/config.exs
# ...
environment :prod do
  # ...
  set vm_args: "rel/vm.args"
end
```

and the `vm.args` itself:

```
# rel/vm.args
## Name of the node - this is the only change
-name hello@${RANCHER_IP}

## Cookie for distributed erlang
-setcookie something-secret-here-please-change-me

## Heartbeat management; auto-restarts VM if it dies or becomes unresponsive
## (Disabled by default..use with caution!)
##-heart

## Enable kernel poll and a few async threads
##+K true
##+A 5

## Increase number of concurrent ports/sockets
##-env ERL_MAX_PORTS 4096

## Tweak GC to run more often
##-env ERL_FULLSWEEP_AFTER 10

# Enable SMP automatically based on availability
-smp auto
```

We are using `${RANCHER_IP}` syntax which together with distillery's `REPLACE_OS_VARS=true`
allows to set the node name dynamically based on `RANCHER_IP` ENV variable.

Next, in order to set this `RANCHER_IP` variable we will use Rancher's internal metadata API.
We will put this inside `rel/rancher_boot.sh` script that will be set as the entrypoint in our container.

```bash
#!/bin/sh
set -e

export RANCHER_IP=$(wget -qO- http://rancher-metadata.rancher.internal/latest/self/container/primary_ip)

/opt/app/bin/hello $@
```

And finally, we need to tweak a little our release Dockerfile. Instead of relying on the default from mix_docker
we will provide our own.

```dockerfile
# Dockerfile.release
FROM bitwalker/alpine-erlang:6.1

RUN apk update && \
    apk --no-cache --update add libgcc libstdc++ && \
    rm -rf /var/cache/apk/*

EXPOSE 4000
ENV PORT=4000 MIX_ENV=prod REPLACE_OS_VARS=true SHELL=/bin/sh

ADD hello.tar.gz ./
RUN chown -R default ./releases

USER default

# the only change are these two lines
COPY rel/rancher_boot.sh /opt/app/bin/rancher_boot.sh
ENTRYPOINT ["/opt/app/bin/rancher_boot.sh"]
```

After building the image and upgrading Rancher service with new image you can check if containers can connect with each other.
This can be done by connecting to remote machine via SSH and running `docker exec` like this:


```bash
core@host1 ~ $ docker exec -it e3c6a817b618 /opt/app/bin/rancher_boot.sh remote_console
Erlang/OTP 18 [erts-7.3.1] [source] [64-bit] [smp:2:2] [async-threads:10] [kernel-poll:false]

Interactive Elixir (1.3.4) - press Ctrl+C to exit (type h() ENTER for help)
iex(hello@10.42.96.65)1>
```

As you can see in the iex prompt the node is set to use Rancher overlay network IP.
Now start another container for the same service and get it's IP (it will also be in the `10.42.x.x` network).
To confirm that nodes can see each other you can try to connect from one to another using `Node.connect`.
Assumming the IP address of second container is `10.42.240.66`:

```bash
iex(hello@10.42.96.65)1> Node.connect :"hello@10.42.240.66"
true
iex(hello@10.42.96.65)2> Node.list
[:"hello@10.42.240.66"]
```

And on the second node:

```bash
core@host2 ~ $ docker exec -it 47dd4308fe8e /opt/app/bin/rancher_boot.sh remote_console
Erlang/OTP 18 [erts-7.3.1] [source] [64-bit] [smp:2:2] [async-threads:10] [kernel-poll:false]

Interactive Elixir (1.3.4) - press Ctrl+C to exit (type h() ENTER for help)
iex(hello@10.42.240.66)1> Node.list
[:"hello@10.42.96.65"]
```

Now you can do all the standard distributed Elixir/Erlang stuff using `Node` module.

## DNS-based auto-discovery

In the previous sections we managed to setup a connection between two Elixir nodes, but it required providing the other node
IP address manually. This is definitely not acceptable for production, so let's make use of aforementioned DNS.

The Elixir equivalent of nslookup is `:inet.gethostbyname` or more specifically `:inet_tcp.getaddrs(name)`.
Running this function inside one or our containers will return a list of all service containers IP addresses:

```bash
iex(hello@10.42.96.65)11> :inet_tcp.getaddrs 'my-hello-service'
{:ok, [{10, 42, 72, 199}, {10, 42, 240, 66}, {10, 42, 96, 65}]}
```

All is left is to spawn an erlang process on every node that will periodically call this function and connect to other nodes.
And we can make it as a simple GenServer that will check the DNS every 5 seconds.


```elixir
# lib/hello/rancher.ex
defmodule Hello.Rancher do
  use GenServer

  @connect_interval 5000 # try to connect every 5 seconds

  def start_link do
    GenServer.start_link __MODULE__, [], name: __MODULE__
  end

  def init([]) do
    name = Application.fetch_env!(:hello, :rancher_service_name)
    send self, :connect

    {:ok, to_char_list(name)}
  end

  def handle_info(:connect, name) do
    case :inet_tcp.getaddrs(name) do
      {:ok, ips} ->
        IO.puts "Connecting to #{name}: #{inspect ips}"
        for {a,b,c,d} <- ips do
          Node.connect :"hello@#{a}.#{b}.#{c}.#{d}"
        end

      {:error, reason} ->
        IO.puts "Error resolving #{inspect name}: #{inspect reason}"
    end

    IO.puts "Nodes: #{inspect Node.list}"
    Process.send_after(self, :connect, @connect_interval)

    {:noreply, name}
  end
end
```

Then we plug it into our app supervision tree:

```elixir
# lib/hello.ex
children = [
  # ...
  worker(Hello.Rancher, [])
]
```

We do not need to worry about nodes that disappear - they will be removed from nodes list as soon as they disconnect.
Also `Node.connect` does not care about connecting twice to the same node, so there is no need to check `Node.list` before
connecting.

One last thing that will make your life much easier - dynamically setting Rancher service name.

As you can see in the code above the name of service (and hence the DNS host) is taken from application config `:rancher_service_name` key.
We could set this to a static value in `config/prod.exs`, but it is much better to make it also auto-discoverable.

In `config/prod.exs` put:

```elixir
config :hello, :rancher_service_name, "${RANCHER_SERVICE_NAME}"
```

and then modify `rel/rancher_boot.sh` to match:

```bash
#!/bin/sh
set -e

export RANCHER_IP=$(wget -qO- http://rancher-metadata.rancher.internal/latest/self/container/primary_ip)
export RANCHER_SERVICE_NAME=$(wget -qO- http://rancher-metadata.rancher.internal/latest/self/service/name)

/opt/app/bin/hello $@
```

We are again using Rancher internal metadata service to get the name of current service.
This will allow to reuse the same container image for different services (with possibly different runtime configuration).


## Show time!

In the short screencast below you can see it all in action.
On the left side there is the log stream from one of the containers
and on the right side there is a list of containers running under "my-hello-service" service.
As I add or remove containers by scaling the service the container on the right catches up with the changes
and updates it's connected nodes list.

<a class="img" href="https://v.usetapes.com/SdRPIY7jph" target="_blank">
  <img src="https://d2p1e9awn3tn6.cloudfront.net/SdRPIY7jph.jpg"/>
  <span>https://v.usetapes.com/SdRPIY7jph</span>
</a>
