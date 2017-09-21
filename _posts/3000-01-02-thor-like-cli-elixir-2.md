---
title: Building Thor-like CLI in Elixir 2
class: two-columns
draft: true
---

Since ruby is an interpreted language there is no such thing as compilation, but similar two phases can be distinguished: preparing the CLI class and executing an action based on command line arguments.


```ruby
## RUBY

class Thor



  # Use [inherited]hook to inject module into class object
  #  [TK: link to inherited]

  def self.inherited(base)
    base.extend(ClassMethods)
  end

























  module ClassMethods



    # When `desc(text)` method is called, save the text
    # in class instance variable `@__desc`

    def desc(text)
      @__desc = text
    end        











    # Subscribe to any new method added via [method_added]() hook
    # and if there is something inside `@__desc` instance variable
    # add new entry to `@__actions` array [TK: link to method_added]

    def method_added(method)
      if @__desc
        __actions << [method, @__desc]
        @__desc = nil
      end
    end

    def __actions
      @__actions ||= []
    end
  end















  # During the execution, if there is an action name given,
  # use `send` to run method with that name, if not,
  # run the `help` method ...

  def run(args)
    if cmd = args.shift
      send(cmd, *args)
    else
      help
    end
  end



  # ... that will read the `@__actions` array and print its contents.

  def help
    self.class.__actions.each do |action, desc|
      puts "#{action} - #{desc}"
    end
  end
```

```elixir
## ELIXIR

defmodule Thor do

  # Instead of `self.included(base)` hook we are using `__using__/1`
  # macro which is executed when compiler sees `use Thor` line.
  # In that macro we put some code that will be simply put
  # in our App module instead of `use Thor`.

  defmacro __using__(_opts) do
    quote do

      # Since there is no ruby-like inheritance, we need to import
      # `desc/1` function from `Thor.Builder` module.

      import Thor.Builder, only: [desc: 1]

      # During compilation we can use [module attributes], in this
      # case the first one is to keep the last description
      # (similar to `@__desc`) and the second one will store all
      # actions (similar to `@__actions`) hence it is marked
      # with `accumulate: true`.

      Module.register_attribute(__MODULE__, :desc, [])
      Module.register_attribute(__MODULE__, :actions, accumulate: true)

      # The last two lines define [compile-time hooks]:
      #   `@on_definition` will be called no every function definition
      #   `@before_compile` will be called right before the module
      # is compiled into bytecode.

      @on_definition  Thor.Builder
      @before_compile Thor.Builder
    end
  end

  defmodule Builder do

    # The mentioned `desc/1` function is actually a macro.
    # All it does is replace `desc("foo")` with `@desc "foo"`
    # <br>(We could omit it entirely and write `@desc "label"`
    # before every action but this way is more flexible
    # and looks the same as the ruby version)

    defmacro desc(text) do
      quote do
        @desc unquote(text)
      end
    end

    # When the elixir compiler sees a new function definition
    # it will call the [`__on_definition__`] function.
    # Since we are interested only in public function definitions
    # (defs) we match on second function argument. While this code
    # is obviously different from ruby version, it does exactly
    # the same thing, except it is using module attributes
    # instead of class instance variables.
    # The biggest difference is, because `:actions` attribute
    # was declared with `accumulate: true` we can simply use
    # `put_attribute` and the value will be added to the front
    # of the list.

    def __on_definition__(env, :def, name, _args, _guards, _body) do
      if desc = Module.get_attribute(env.module, :desc) do
        Module.put_attribute(env.module, :actions, {name, desc})
        Module.delete_attribute(env.module, :desc)
      end
    end

    # And we don't really care about the rest of definitions
    # (private function and macros)

    def __on_definition__(_, _, _, _, _, _) do
    end

    # When the elixir compiler is done with the `App` module
    # it calls the `__before_compile__/1` macro in `Thor.Builder`
    # module.

    defmacro __before_compile__(_env) do
      quote do

        # Here we define the same two functions (`run` and `help`)
        # as in ruby version.
        # Instead of using `if` to check for first argument we
        # use [pattern matching] to match on empty arguments
        # list (`[]`) or `[first | rest]`. Then we use [`apply/3`]
        # function to dynamically call a function by name
        # passing: [`__MODULE__`] - current module name,
        # `action` converted to atom (symbol) and `args` -
        # rest of arguments (that can be empty).

        def run([]) do
          help
        end

        def run([action | args]) do
          apply(__MODULE__, String.to_atom(action), args)
        end

        # The `help` function uses [for comprehension] to loop
        # through `@actions` module attribute and print actions
        # with their descriptions.

        def help do
          for {action, desc} <- @actions do
            IO.puts "#{action} - #{desc}"
          end
        end
      end
    end
  end
end
```
