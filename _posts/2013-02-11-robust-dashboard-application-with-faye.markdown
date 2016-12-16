---
title: Robust dashboard application with Faye
source: Monterail Blog
source_url: http://monterail.com/blog/2013/robust-dashboard-application-with-faye/
---

There’s a dashboard in one of our applications that shows data from various external services. The more data we were adding to this dashboard, the worse its performance and user experience was getting until the site eventually became unusable. It got to the point where its user had to wait 10 seconds or even more for the content to show up. Unfortunately, caching didn’t help much.

Here’s the story of what we did to reduce the load time.

![The mockup of the dashboard](https://monterail-share.s3.amazonaws.com/public/codetunes/2013-02-11-robust-dashboard-application-with-faye/dashboard.png)

## Humble beginnings

The first version of the dashboard was dead simple: call remote APIs during the request and render the results. It quickly turned out it won’t work—a few of API calls took quite a lot of time to respond, and making them in parallel via Rails’ action is difficult and error-prone.

Obviously, if you have to wait such long time for the homepage to load, it’s very poor user experience. You might even wonder that something’s wrong.

The second take was much better. If the homepage is requested, let’s return its layout only and then use AJAX to fetch data. Unfortunately, due to browser limitations and the amount of containers to fill with the data (usually 7), it was still insufficient: long-running spinners and AJAX calls’ timeouts.



## Faye to the rescue!



Another idea was to use [Faye](http://faye.jcoglan.com/) for pushing data into the browser, so that there would be no more timeouts during HTTP requests.

Right after the loaded homepage layout, the browser subscribed to specific Faye channel and triggered the processing of API calls. When one of the them succeeded, its results were pushed to the browser.

The solution was quite satisfying, yet we wondered if we could have done it even better.

![Timeline 1](https://monterail-share.s3.amazonaws.com/public/codetunes/2013-02-11-robust-dashboard-application-with-faye/tymon-faye-timeline1.png)

_Why?_ Look at the timeline, there’s still the unnecessary delay—API jobs could have been started much sooner. Due to Faye channels architecture, the client receives only the messages that were sent after having subscribed to the channel.

![Timeline 2](https://monterail-share.s3.amazonaws.com/public/codetunes/2013-02-11-robust-dashboard-application-with-faye/tymon-faye-timeline2.png)

As you can see, the earlier the jobs are started, the earlier they finish and they could be able to push the results before the client subscribes to the channel which would result in message loss. In this case, **API Job #2 Faye push** happens before **Faye subscribe**.

If only there was a way to save those message somehow when the client is not yet connected and send them when it’s connected…



## Redis Faye back-end



Turns out it’s possible using a bit modified [Redis back-end for Faye](https://github.com/faye/faye-redis-ruby). Consider the following code:

```ruby
module Faye
  class PersistentRedis < Faye::Redis
    DEFAULT_EXPIRE = 60 # default expiration timeout for awaiting messages

    def subscribe(client_id, channel, &callback)
      super
      publish_awaiting_messages(channel)
    end

    def publish_awaiting_messages(channel)
      # fetch awaiting messages from redis and publish them
      @redis.lpop(@ns + "/channels#{channel}/awaiting_messages") do |json_message|
        if json_message
          message = Yajl::Parser.parse(json_message)
          publish(message, [message["channel"]], json_message)
          publish_awaiting_messages(channel)
        end
      end
    end

    def publish(message, channels, json_message = nil)
      init
      @server.debug 'Publishing message ?', message

      json_message ||= Yajl::Encoder.encode(message)
      channels = Channel.expand(message['channel'])
      keys = channels.map { |c| @ns + "/channels#{c}" }

      @redis.sunion(*keys) do |clients|
        if clients.empty?
          key = @ns + "/channels#{message["channel"]}/awaiting_messages"
          # Store message in redis
          @redis.rpush(key, json_message)
          # Set expiration time to one minute
          @redis.expire(key, @options[:expire] || DEFAULT_EXPIRE)
        else
          clients.each do |client_id|
            @server.debug 'Queueing for client ?: ?', client_id, message
            @redis.rpush(@ns + "/clients/#{client_id}/messages", json_message)
            @redis.publish(@ns + '/notifications', client_id)
          end
        end
      end

      @server.trigger(:publish, message['clientId'], message['channel'], message['data'])
    end
  end
end

# Faye::Logging.log_level = :info
faye_server = Faye::RackAdapter.new(
  :mount => '/faye',
  :timeout => 30,
  :engine => {
    :type  => Faye::PersistentRedis,
    :expire => 60 # one minute
  }
)
```


A part of `publish` checks if there any clients subscribed to the channel—if not, the message is stored in the list:


```
/channels/$channel/awaiting_messages
```


When the clients eventually subscribes, the stored messages are removed from the list and pushed.

Importantly, there is a possibility that the client never subscribes to the channel. To prevent storing the ever-increasing amount of messages in Redis, expiration time is set to one minute on the same key.



## The final solution



The full resultant stack consists of Rails, [Sidekiq](http://mperham.github.com/sidekiq/), and the modified [Faye](http://faye.jcoglan.com/) server.

When the first request takes place, API jobs are queued in Sidekiq. Then the finished jobs are pushed to Faye and saved in Redis when needed. The browser loads the layout and subscribes to Faye channel that retrieves both the messages that were already stored and those new ones that are being created.
