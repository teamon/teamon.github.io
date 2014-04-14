---
title: Ruby youtube_g
date: '2008-07-05'
author: Tymon Tobolski
tags: ruby
source: jogger
source_url: http://teamon.jogger.pl/2008/07/05/ruby-youtube-g
---
Poszukując biblioteki YouTube do Ruby natrafiłem na <a href="http://youtube-g.rubyforge.org/">youtube\_g</a>. Niestety doc trochę kłamie więc musiałem się z tym pobawić. Tym samym postanowiłem opisać tu parę możliwości wykorzyystania tej biblioteki.

### Instalacja
Bardzo skomplikowana, jak wszystko w Ruby

```bash
sudo gem install youtube-g
```
i już

### Pobranie informacji o filmie

```ruby
require "youtube_g"

client = YouTubeG::Client.new

video_id = 'ldMUEJBA1tk'

video = client.video_by("http://gdata.youtube.com/feeds/videos/#{video_id}")  # => YouTubeG::Model::Video
# api twierdzi ze methoda video_by przyjmuje jako parametr video_id, okazuje się jednak, że należy podać taki oto url
# obiekt video daje nam dostęp do takich oto właściwości:

video.title # => "Red Hot Chili Peppers - Can't Stop"
video.player_url # => "http://www.youtube.com/watch?v=ldMUEJBA1tk"
video.categories # => [<YouTubeG::Model::Category:0x123c480 @term="Music", @label="Music">]
video.categories.first.label # => "Music"
video.author # => <YouTubeG::Model::Author:0x1234cd0 @name="littleteapot666", @uri="http://gdata.youtube.com/feeds/users/littleteapot666">
video.can_embed? # => true
video.duration # => 276 (sekundy)
video.rating # => #<YouTubeG::Model::Rating:0x1223494 @min=1, @max=5, @average=4.91, @rater_count=5116>
video.rating.average # => 4.91
video.thumbnails # => [<YouTubeG::Model::Thumbnail:0x1226950 @width=130, @url="http://img.youtube.com/vi/ldMUEJBA1tk/2.jpg", @time="00:02:18", @height=97>, <YouTubeG::Model::Thumbnail:0x1226680 @width=130, @url="http://img.youtube.com/vi/ldMUEJBA1tk/1.jpg", @time="00:01:09", @height=97>, <YouTubeG::Model::Thumbnail:0x12263b0 @width=130, @url="http://img.youtube.com/vi/ldMUEJBA1tk/3.jpg", @time="00:03:27", @height=97>, <YouTubeG::Model::Thumbnail:0x12260e0 @width=320, @url="http://img.youtube.com/vi/ldMUEJBA1tk/0.jpg", @time="00:02:18", @height=240>]
video.thumbnails.first.url # => "http://img.youtube.com/vi/ldMUEJBA1tk/2.jpg"
video.view_count # => 2497942
```

### Pobranie listy filmów o podanych kryteriach

```ruby
rresult = client.videos_by(:query => "red hot") # szukanie po frazie

result.videos # => tablica z obiektami YouTubeG::Model::Video
result.max_result_count # => 25
result.total_result_count # => 56403

# inne możliwości zapytań
client.videos_by(:categories => [:music])
client.videos_by(:tags => ['rock', 'funk'])
client.videos_by(:user => "pietraswithin")

# i jeszcze takie
client.videos_by(:most_viewed)
client.videos_by(:top_rated, :time => :today)
```

Dzięki youtube\_g bardzo łatwo można operować na filmach. Daje też na przykład możliwość sprawdzenia czy film podany przez użytkownika naszego serwisu można umieścić (can\_embed?) co zapobiega dodawaniu filmów, które nie będą się odtwarzać na stronie.

