---
title: Setting up a Rails development environment on OS X using Docker
source: Monterail Blog
source_url: http://monterail.com/blog/2015/docker-compose
---

One of our designers wanted to make some changes to our [job offer page](http://join.hussa.rs). At first it seemed trivial - just change some HTML inside a rails app. Then we realised that we would need to setup the whole development environment on his Mac. With the help of homebrew this didn't sound like a challenge at all. But then it came to my mind that this might be the perfect case for setting up a development environment using [docker](https://www.docker.com/) and [docker-compose](https://docs.docker.com/compose/) (formerly [fig](http://www.fig.sh/)).

![](http://imgs.xkcd.com/comics/automation.png)
<p class="alt"><a href="https://xkcd.com/1319/">XKCD 1319</a></p>


## Setting up docker on Mac OS X

Docker does not have native Mac OS X support yet, but there are already tools that allow running docker inside a virtual machine with the _feeling_ of having it installed locally. After struggling with [boot2docker](http://boot2docker.io/), [kitematic](https://kitematic.com/) and [vagrant](https://www.vagrantup.com/) I finally found a setup that _just works_ using [docker-machine](http://docs.docker.com/machine/).

> This setup is using homebrew and Virtual Box, but you can install docker binaries in any way you like, as well as use VMWare instead.

## Update your homebrew

This may sound obvious, but I've spent enough time fighting with older versions of docker and docker-compose that it's worth mentioning here.
Simply run

```bash
brew update
```

## Install docker-compose

docker-compose (fig) is a simple utility for running a set of containers defined in a YAML file. It removes the pain of managing separate containers for app, database and supporting services and lets you focus on your app development. Head over to [the great documentation](http://www.fig.sh/) for more details.
We will use it to define our app dependencies as well as the rails app container itself.

```bash
brew install docker-compose
```

## Install docker-machine

docker-machine allows for quick provisioning of docker-ready nodes, from local virtual machines (Virtual Box, VMWare) to cloud servers (EC2, DigitalOcean, Rackspace and more).
This is a single point of management for multiple local or remote environments from one terminal.

```bash
brew install docker-machine
```

## Validate your setup

After installing all docker packages you should be able to access the following commands. Please pay attention to the version numbers, there is a significant chance that earlier versions of those tools won't work.

```bash
λ docker --version
Docker version 1.6.0, build 4749651

λ docker-compose --version
docker-compose 1.2.0

λ docker-machine --version
docker-machine version 0.2.0 (HEAD)
```

## Getting Virtual Box

Since we want to create a local development environment, we will use Virtual Box. You can download the installed package from [Virtual Box Downloads page](https://www.virtualbox.org/wiki/Downloads)


## Creating a new docker node inside Virtual Box

docker-machine virtual machine drivers are based on boot2docker. Invoking the following command will setup a new Virtual Box VM using boot2docker image.

```bash
docker-machine create -d virtualbox docker-vm
```

You can check the status of your new vm using:

```bash
λ docker-machine ls
NAME        ACTIVE   DRIVER       STATE     URL                         SWARM
docker-vm   *        virtualbox   Running   tcp://192.168.99.100:2376
```

As you can see above, our new machine has an IP address `192.168.99.100`.
This address is required to tell the docker command line tool where the docker daemon is running.
Fortunately, we don't need to remember it.

## Setting up your shell

docker-machine comes with a handy command called `env`.

```bash
λ docker-machine env docker-vm
export DOCKER_TLS_VERIFY=1
export DOCKER_CERT_PATH="/Users/teamon/.docker/machine/machines/docker-vm"
export DOCKER_HOST=tcp://192.168.99.100:2376
```

Those `ENV` variables _tell_ docker CLI the location of the desired host you want to operate on.
In order to make your life easier, add this line to your `.zshrc`/`.bashrc` file to have the environment setup correctly in every new terminal:

```bash
# .zshrc/.bashrc
eval "$(docker-machine env docker-vm)"
```

## (bonus) Edit `/etc/hosts`

While this step is not necessary, it might be easier to use an easy-to-remember name instead of an IP address.
Edit your `/etc/hosts` file and add this line at the very bottom:

```
192.168.99.100  docker
```

> NOTE: Your IP address might be different. You can always check it using `docker-machine ip` command

And it's done — now you have a fully functional docker environment running on OS X!



## Easy development of Ruby on Rails apps with docker-compose

Now to the most exciting part.

> **!!! VERY VERY VERY IMPORTANT !!!**
  You **MUST** put your application directory under the `/Users` directory. If you don't, the file sharing between OS X file system and Virtual Box VM will **not** work. Symlinking won't work either.

docker-compose requires at least two files to be added to your app's directory: `Dockerfile` and `docker-compose.yml`.


## `Dockerfile`

The minimal content of your `Dockerfile` should contain something like this:

```dockerfile
FROM ruby:2.2.0
RUN apt-get update -qq && apt-get install -y build-essential nodejs

RUN mkdir /app

WORKDIR /tmp
COPY Gemfile Gemfile
COPY Gemfile.lock Gemfile.lock
RUN bundle install

WORKDIR /app

CMD ["rails", "server", "-b", "0.0.0.0"]
```


## `docker-compose.yml`

Our app requires two companion services: mysql and redis. We can easily define those using a friendly YAML syntax:

```yml
web:
  build: .
  volumes:
    - .:/app
  ports:
    - "3000:3000"
  links:
    - db
    - redis

db:
  image: library/mysql:5.6.22
  environment:
    MYSQL_ROOT_PASSWORD: password # required by mysql image

redis:
  image: redis
```

## MySQL database configuration
We also need to configure the `config/database.yml` file to point to our mysql container which is accessible under `db` hostname.

```yaml
development:
  adapter: mysql2
  encoding: utf8
  host: db # <---
  database: app_development
  username: root
  password: password # <--- same as MYSQL_ROOT_PASSWORD above
```

## Redis configuration
Connecting to redis also needs to be tweaked a little - now the redis URL will be `redis://redis:6379/0` (using the `redis` host).

## Up and running

Now we can build our app and start everything together with a single command:

```bash
docker-compose up
```

You should see output similar to foreman's, with three differently colored log files. And if everything went fine, you should be able to see your app at [http://docker:3000](http://docker:3000)  (or [http://192.168.99.100:3000](http://192.168.99.100:3000) if you haven't edited `/etc/hosts`)

## Tips & tricks

It might be useful to have a separate `database.docker.yml` file and a `bin/docker-setup` script to set everything up automatically after a fresh cloning of the repository.

```bash
# bin/docker-setup
#!/bin/bash

set -e

cp -f config/database.docker.yml config/database.yml
cp -f config/application.docker.yml config/application.yml

# build app image
docker-compose build

# start mysql and redis in background
docker-compose start db
docker-compose start redis

# setup database
docker-compose run web rake db:create db:migrate

# ensure all containers are up and running
docker-compose up
```


## The result

I can't think of a better summary than this quote from one of our designers Paweł:

> Design can seldomly by validated without actually looking at what you made. And when what you made is code, it's getting harder by the minute. One can deploy after every little change which is counter productive or wait until those changes accumulate  which isn't fast. Docker helps with that. I'm happy now.
