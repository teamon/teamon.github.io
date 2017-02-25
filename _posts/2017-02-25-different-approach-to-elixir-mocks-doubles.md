---
title: A different approach to testing elixir with mocks/doubles
---

After watching [J B Rainsberger's talk "Integrated Tests Are A Scam"](https://www.youtube.com/watch?v=VDfX44fZoMc) I decided to revisit the elixir ecosystem for available tools for mocks/doubles.

During that research I got an idea how it could be done a bit differently. There was no other option than to try it.


This is a proof of concept for a different approach to elixir test doubles.
Some of the goals/issues I've tried to solve here are:

- No module compilation hackery
- Reduce boilerplate to the minimum
- Be explicit
- Allow multiple implementations per module

## Usage example

Let's start with a service that talks to real world - the `Sandbox.Store`

```elixir
defmodule Sandbox.Store do
  # Include `use Double` in module you want to stub/mock in tests
  # and that's it, nothing else is required.
  use Double

  def users do
    IO.puts "REAL Store.users/0"
    [:real]
  end

  def create(params) do
    IO.puts "REAL Store.create/1"
    {:ok, params}
  end
end
```


Now let's make a `Sandbox.Controller` module that will use our store.

```elixir
defmodule Sandbox.Controller do
  # This is how dependency injection is done
  # Just call Double.get(SomeModule)
  @store Double.get(Sandbox.Store)

  def index do
    case @store.users() do
      []      -> :zero
      [_one]  -> :one
      _list   -> :many
    end
  end

  def create(kind) do
    @store.create(%{"kind" => kind})
  end

  # this is just for testing the execution in :dev
  def devrun do
    index
    create(name: "Alice")
  end
end
```

Let's see if we didn't break the real implementation

```
$ mix run -e Sandbox.Controller.devrun
REAL Store.users/0
REAL Store.create/1
```

It works as expected.

Now, let's write some tests.




```elixir
# test/sandbox/controller_test.exs
defmodule Sandbox.ControllerTest do
  use ExUnit.Case

  alias Sandbox.Controller

  ## TEST QUERIES

  test "index when zero" do
    # use Double.return(mod, fun, ret) to stub return value
    Double.return(Sandbox.Store, :users, [])

    assert Controller.index == :zero
  end

  test "index when one" do
    Double.return(Sandbox.Store, :users, [:alice])

    assert Controller.index == :one
  end

  test "index when many" do
    Double.return(Sandbox.Store, :users, [:alice, :bob, :eve, :dave])

    assert Controller.index == :many
  end


  ## TEST COMMANDS

  test "create good" do
    Controller.create(:good)

    # use Double.called?(mod, fun) to check if function was called
    assert Double.called?(Sandbox.Store, :create)
  end

  test "create bad" do
    Controller.create(:bad)

    assert Double.called?(Sandbox.Store, :create, [%{"kind" => :bad}])
  end
end
```


One more thing to add - in the `test_helper.exs`

```elixir
# test/test_helper.exs
Double.start_link() # <-- this line
ExUnit.start()
```

And finally let's run the tests:

```
$ mix test
.....

Finished in 0.03 seconds
5 tests, 0 failures

Randomized with seed 454606
```

\o/

## Conclustions

- No module compilation hackery
  - Well, we do generate additional module, but there is no recompilation in runtime

- Reduce boilerplate to the minumum
  - Two additional lines in regular code, no need to define mock/double modules by hand

- Be explicit
  - The dependency from Controller to Store has been defined explicitly. Also the return values stubs are explicit

- Allow multiple implementations per module
  - Instead of having written a one TestStore by hand we can dynamically set the return value we expect

## Questions?
Since it took more to write this post than the actual code I have a feeling that I'm missing something important here. I'd be more than happy to discuss this, especially if you find any flaws in the approach.

The source code of `Double` as well all others can be find in [the GitHub repo](https://github.com/teamon/elixir-test-doubles).
