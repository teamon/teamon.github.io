---
author: Tymon Tobolski
date: 2010-02-13
title: Webapp testing with Webrat and [your language]
tags: testing
source: jogger
source_url: http://blog.teamon.eu/2010/02/04/webrat-for-your-language/
---

[Webrat](http://github.com/brynary/webrat) was written mainly to improve Rails` web applications testing. But what if webapp is written in something else? The answer is simple - webrat!

Requirements: Ruby

Installation: `gem install mechanize webrat` Done.

Now create file `test.rb` and put in there:

READMORE

```ruby
require "webrat"

# configuration

Webrat.configure do |config|
  config.mode = :mechanize
end

class MechanizeWorld < Webrat::MechanizeAdapter
  include Webrat::Matchers
  include Webrat::Methods

  Webrat::Methods.delegate_to_session :response_code, :response_body
end

Spec::Runner.configure do |config|
  include Webrat::Methods
end

# Tests start here

describe "Awesome system" do
  it "should work" do
    visit "http://0.0.0.0:8080"
    click_link "Login"
    fill_in "Username", :with => "teamon"
    click_button "Login"
    response_body.should include "Wrong password"
  end
end
```

To run tests use command: `spec test.rb`

![](/assets/images/blog/webapp-testing-with-webrat-pic1.png)

For colorful and more readable output use: `spec --color --format specdoc test.rb`

![](/assets/images/blog/webapp-testing-with-webrat-pic2.png)

That's almost all. While it works pretty well having all tests in one file is not what we are used to after working with Rails. Let's fix that by splitting that code into `spec_helper.rb` and `login_spec.rb` files.

```ruby
# spec_helper.rb
require "webrat"

Webrat.configure do |config|
  config.mode = :mechanize
end

class MechanizeWorld < Webrat::MechanizeAdapter
  include Webrat::Matchers
  include Webrat::Methods

  Webrat::Methods.delegate_to_session :response_code, :response_body
end

Spec::Runner.configure do |config|
  include Webrat::Methods
end
```

```ruby
# login_spec.rb
require File.join( File.dirname(__FILE__), "spec_helper" )

describe "Login system" do
  it "should not let me in" do
    visit "http://0.0.0.0:8080"
    click_link "Login"
    fill_in "Username", :with => "teamon"
    click_button "Login"
    response_body.should include "Wrong password"
  end
end
```

simple `Rakefile` for running all tests

```ruby
# Rakefile
desc "Run specs"
task :spec do
  system("spec path/to/tests -O path/to/tests/spec.opts")
end
```

and `spec.opts`

```
--color
--format specdoc
```

Now you can run test with `rake spec` command. Note that files with tests must end with `_spec.rb` in order to get executed by spec command.

## Textmate integration

It is possible to run specs from [Textmate](http://macromates.com/) via [ruby-rspec bundle](http://github.com/textmate/ruby-rspec.tmbundle). Just clone repository, double click on `ruby-rspec.bundle`, open test file and press `⌘ + R` to get something like:

![](/assets/images/blog/webapp-testing-with-webrat-pic3.png)
