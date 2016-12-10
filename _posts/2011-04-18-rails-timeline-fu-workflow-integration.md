---
title: Rails timeline_fu and workflow integration
---

Quick tip on how to integrate [timeline\_fu](http://github.com/jamesgolick/timeline_fu) and [workflow](http://github.com/geekq/workflow) callbacks.

```ruby
class MyModel < ActiveRecord::Base
  include Workflow

  workflow do
    state :foo do
      event :barrize, :transitions_to => :bar
    end    
    state :bar
  end

  # This few lines below provides integration between timeline_fu and workflow
  workflow_spec.state_names.each do |state|
    define_model_callbacks :"#{state}_entry"
    define_model_callbacks :"#{state}_exit"
    define_method(:"on_#{state}_entry") {|*args| run_callbacks(:"#{state}_entry") }
    define_method(:"on_#{state}_exit") {|*args| run_callbacks(:"#{state}_exit") }
  end

  # For example for states :foo and :bar it allows to setup timeline_fu event like:
  fires :model_entered_foo, :on => :foo_entry
  fires :model_entered_bar, :on => :bar_entry
  fires :model_exited_foo, :on => :foo_exit
  fires :model_exited_foo, :on => :bar_exit
end
```
