---
author: Tymon Tobolski
date: 2010-07-26
title: 2.5 times faster heckle
tags: ruby, rspec
source: tumblr
source_url: http://tumblr.teamon.eu/post/738280016/2-5-times-faster-heckle
---

RSpec has built-in support for [heckle](http://rspec.info/documentation/tools/heckle.html),
but executing every `$ spec spec_file —heckle my_method` from command line is boring.

Why not use rake?

```ruby
desc "Heckle all"
task :heckle_all do
  sh "spec spec/models/address_spec.rb --heckle 'Address#to_s'"
  sh "spec spec/models/category_spec.rb --heckle 'Category#permalink'"
  sh "spec spec/models/facturer_spec.rb --heckle 'Facturer#permalink'"
  sh "spec spec/models/product_spec.rb --heckle 'Product#permalink'"
  sh "spec spec/integration/cart_spec.rb --heckle 'Cart#<<'"
  sh "spec spec/integration/cart_spec.rb --heckle 'Cart#empty?'"
  sh "spec spec/integration/cart_spec.rb --heckle 'Cart#clear!'"
  sh "spec spec/integration/cart_spec.rb --heckle 'Cart#total_price'"
  sh "spec spec/integration/cart_spec.rb --heckle 'Cart#quantity_of'"
  sh "spec spec/integration/cart_spec.rb --heckle 'CartItem#total_price'"
end
```


Yeah, nice one! Well, not really. `$ rake heckle_all` takes about **87 seconds** to complete. First line executes shell script `spec` that runs ruby, then spec with heckle, then next line starts its own ruby again and again. Ruby starts slowly. Can it be done better?

Yes! After some hacking I ended up with something like this:

```ruby
desc "Heckle all"
task :heckle_all do
  heckle "spec/models/address_spec.rb", "Address#to_s"
  heckle "spec/models/category_spec.rb", "Category#permalink"
  heckle "spec/models/facturer_spec.rb", "Facturer#permalink"
  heckle "spec/models/product_spec.rb", "Product#permalink"
  heckle "spec/integration/cart_spec.rb", "Cart#<<"
  heckle "spec/integration/cart_spec.rb", "Cart#empty?"
  heckle "spec/integration/cart_spec.rb", "Cart#clear!"
  heckle "spec/integration/cart_spec.rb", "Cart#total_price"
  heckle "spec/integration/cart_spec.rb", "Cart#quantity_of"
  heckle "spec/integration/cart_spec.rb", "CartItem#total_price"
end

require "spec"
def heckle(file, method)
  options = Spec::Runner::Options.new($stderr, $stdout)
  options.load_heckle_runner(method)
  options.files << file
  Spec::Runner.use options
  Spec::Runner.run
end
```

Woohoo, `$ rake heckle_all` now takes *only* **33 seconds**. Thats **2.5 times** faster! ;]

Yes, I know, nothing to be excited about, but imagine you have some more code. One hour instead of two and a half! Isn't that impressive?

It couldn't be a benchmark post without nice chart

![](http://media.tumblr.com/tumblr_l4mi0qWijR1qat4ul.png)
