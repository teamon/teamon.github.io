---
author: Tymon Tobolski
date: 2010-08-17
title: Rails 3 remote update form
tags: ruby, rails
source: tumblr
source_url: http://tumblr.teamon.eu/post/967005738/rails-3-remote-update-form
---

[Rails 3](http://rubyonrails.org) brings some nice [unobstrusive javascript](http://www.simonecarletti.com/blog/2010/06/unobtrusive-javascript-in-rails-3/). This very short tutorial will show how to make simple yet powerful ajax update form.

First, grab <a href="http://github.com/rails/jquery-ujs">jquery-ujs</a> file (or gem). Next, create some model and REST controller.

### Controller needs a small change:
```ruby
class FooController < ApplicationController
  def update
    @foo = Foo.find(params[:id])
    if @foo.update_attributes(params[:foo])
      render :json => "Foo successfully updated"
    else
      render :json => @foo.errors, :status => 406
    end
  end
end
```

That's pretty self explaining: when object is valid send notice message, else send errors as json array.

### View:
```haml
= form_for @foo, :remote => true do
  = f.text_field :name
  = f.submit
```

Only the `:remote => true` part is important.

### Some JavaScript
```js
$("form[data-remote]").each(function(i, form){
    var f = $(form)
    var loading = $("<div class='form_loading'></div>"),
        notice  = $("<div class='form_notice'></div>"),
        errors  = $("<ul class='form_errore'></ul>");

    f.append(loading.hide())
    f.prepend(notice.hide())
    f.prepend(errors.hide())

    // hide errors and notice and show loading indicator when loading
    f.bind("ajax:loading", function(){
        errors.hide();
        notice.hide();
        loading.show();
    })
    // hide loading indicator when finished
    f.bind("ajax:complete", function() {
        loading.hide();
    })
    // show notice on success
    f.bind("ajax:success", function(ev, data, status, xhr){
        notice.text(data).show();
    })
    // show errors on failure
    f.bind("ajax:failure", function(ev, xhr, status){
        errors.html("")
        $.parseJSON(xhr.responseText).forEach(function(msg){
            errors.append("<li>" + msg + "</li>")
        })
        errors.show()
    })
})
```
This code will take remote form and register callbacks for showing loader, notice message and errors list.

And that's all, it simply works. And yes, you have to write CSS on your own ;]
