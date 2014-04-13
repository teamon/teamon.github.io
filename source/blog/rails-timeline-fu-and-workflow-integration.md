---
author: Tymon Tobolski
date: 2011-04-18
title: "Rails: timeline_fu and workflow integration"
tags: ruby, rails
source: tumblr
source_url: http://tumblr.teamon.eu/post/4719074656/rails-timeline-fu-and-workflow-integration
---

Quick tip on how to integrate <a href="http://github.com/jamesgolick/timeline_fu">timeline_fu</a> and <a href="http://github.com/geekq/workflow">workflow</a> callbacks.

```ruby
class MyModel < ActiveRecord::Base
  include Workflow
  workflow do
    state :foo do
      event :barrize, :transitions_to => :bar
    end
    state :bar
  end

  # This few lines below provides integration between
  # timeline_fu and workflow
  workflow_spec.state_names.each do |state|
    define_model_callbacks :"#{state}_entry"
    define_model_callbacks :"#{state}_exit"
    define_method(:"on_#{state}_entry") do |*args|
      run_callbacks(:"#{state}_entry")
    end
    define_method(:"on_#{state}_exit") do |*args|
      run_callbacks(:"#{state}_exit")
    end
  end

  # For example for states :foo and :bar it allows
  # to setup timeline_fu event like:
  fires :model_entered_foo, :on => :foo_entry
  fires :model_entered_bar, :on => :bar_entry
  fires :model_exited_foo, :on => :foo_exit
  fires :model_exited_foo, :on => :bar_exit
end
```
