---
title: Building Thor-like CLI in Elixir
class: side-by-side
---

Most Ruby programmes are probably familiar with CLI toolkit [Thor](http://whatisthor.com/).
In a nutshell it allows building command line interfaces using
standard Ruby classes, like this:

```ruby
class App < Thor
  desc "List things"
  def list
    puts "listing"
  end

  desc "Install something"
  def install(name)
    puts "installing #{name}"
  end
end
```

&nbsp;

Here we will go through the minimal implementation in Ruby
and then a similar one but this time in Elixir.

## RUBY IMPLEMENTATION

```ruby
class Thor
  def self.inherited(base)
    base.extend(ClassMethods)
  end
```

Use [`inherited`](https://ruby-doc.org/core-2.2.0/Class.html#method-i-inherited) hook
to inject module into class object.


```ruby
  module ClassMethods
    def desc(text)
      @__desc = text
    end        
```

When `desc(text)` method is called, save the text in class instance variable `@__desc`.

```ruby
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
```

Subscribe to any new method added via
[`method_added`](https://ruby-doc.org/core-2.2.2/Module.html#method-i-method_added) hook
and if there is something inside `@__desc` instance variable
add new entry to `@__actions` array.

```ruby
  def run(args)
    if cmd = args.shift
      send(cmd, *args)
    else
      help
    end
  end
```

During the execution, if there is an action name given,
use `send` to run method with that name, if not,
run the `help` method ...

```ruby
  def help
    self.class.__actions.each do |action, desc|
      puts "#{action} - #{desc}"
    end
  end
end
```

... that will read the `@__actions` array and print its contents.

## ELIXIR

The Elixir version is obviously different, but very similar in the approach.
Instead of classes inherited and modules included into inheritance chain
we use compile-time macros.

```elixir
defmodule Thor do
  defmacro __using__(_opts) do
    quote do



```

Instead of `self.included(base)` hook we are using
[`__using__/1`](https://hexdocs.pm/elixir/Kernel.html#use/2)
macro which is executed when compiler sees `use Thor` line.
In that macro we put some code that will be simply put
in our App module instead of `use Thor`.

```elixir
      import Thor.Builder, only: [desc: 1]


```

Since there is no ruby-like inheritance, we need to import `desc/1`
function from `Thor.Builder` module (defined below).

```elixir
      Module.register_attribute(__MODULE__, :desc, [])
      Module.register_attribute(__MODULE__, :actions, accumulate: true)


```

During compilation we can use [module attributes], in this case
the first one is to keep the last description (similar to `@__desc`)
and the second one will store all actions (similar to `@__actions`)
hence it is marked with
[`accumulate: true`](https://hexdocs.pm/elixir/Module.html#register_attribute/3).

```elixir
      @on_definition  Thor.Builder
      @before_compile Thor.Builder
    end
  end
```

The last two lines define
[compile-time hooks](https://hexdocs.pm/elixir/Module.html#module-compile-callbacks):
<br>[`@on_definition`](https://hexdocs.pm/elixir/Module.html#module-on_definition)
will be called no every function definition
<br>[`@before_compile`](https://hexdocs.pm/elixir/Module.html#module-before_compile)
will be called right before the module
is compiled into bytecode.

```elixir
  defmodule Builder do
    defmacro desc(text) do
      quote do
        @desc unquote(text)
      end
    end
```

The mentioned `desc/1` function is actually a macro.
All it does is replace `desc("foo")` with `@desc "foo"`
<br>(We could omit it entirely and write `@desc "label"`
before every action but this way is more flexible
and looks the same as the ruby version)

```elixir
    def __on_definition__(env, :def, name, _args, _guards, _body) do
      if desc = Module.get_attribute(env.module, :desc) do
        Module.put_attribute(env.module, :actions, {name, desc})
        Module.delete_attribute(env.module, :desc)
      end
    end



```

When the elixir compiler sees a new function definition
it will call the `__on_definition__` function.
Since we are interested only in public function definitions (defs)
we match on second function argument. While this code is obviously
different from ruby version, it does exactly the same thing,
except it is using module attributes instead of class instance variables.
The biggest difference is, because `:actions` attribute
was declared with `accumulate: true` we can simply use
[`put_attribute`](https://hexdocs.pm/elixir/Module.html#put_attribute/3)
and the value will be added to the front of the list.


```elixir
    def __on_definition__(_, _, _, _, _, _) do
    end
```

And we don't really care about the rest of definitions (private function and macros)


```elixir
    defmacro __before_compile__(_env) do
      quote do
```

When the elixir compiler is done with the `App` module
it calls the `__before_compile__/1` macro in `Thor.Builder` module.


```elixir
        def run([]) do
          help
        end

        def run([action | args]) do
          apply(__MODULE__, String.to_atom(action), args)
        end
```

Here we define the same two functions (`run` and `help`) as in ruby version.
Instead of using `if` to check for first argument we use
[pattern matching](https://elixir-lang.org/getting-started/pattern-matching.html)
to match on empty arguments list (`[]`) or `[first | rest]`.
Then we use [`apply/3`](https://hexdocs.pm/elixir/Kernel.html#apply/3)
function to dynamically call a function by name
passing: [`__MODULE__`](https://hexdocs.pm/elixir/Kernel.SpecialForms.html#__MODULE__/0) - current module name, `action` converted to atom (symbol)
and `args` - rest of arguments (that can be empty).


```elixir
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

The `help` function uses [for comprehension] to loop through
`@actions` module attribute and print actions with their descriptions.

With all that in place we can now create out app.
As you can see it looks very similar to the Ruby version
from beginning of this post.


```elixir
defmodule App do
  use Thor

  desc "List things"
  def list do
    IO.puts "listing"
  end

  desc "Install something"
  def install(name) do
    IO.puts "installing #{name}"
  end
end
```


## FINAL NOTES

Both these implementation are very basic. For example, they lack any error handling.
Both will simply blow up when given invalid command name,
although this could be easily handled using Ruby's [respond_to?](https://ruby-doc.org/core-2.4.2/Object.html#method-i-respond_to-3F) or Elixir's [function_exported?/3](https://hexdocs.pm/elixir/Kernel.html#function_exported?/3).

## BONUS

- [Side by side comparison](/2017/thor-like-cli-elixir-macros-ide-by-side) of Ruby & Elixir versions
- [Both implementation as a gist](https://gist.github.com/teamon/6b8a6813dc941d69355e90cf1df734c0) (with decompiled elixir)
