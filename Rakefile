task :default => :serve

desc "Start server"
task :serve do
  require "rack"

  app = Rack::Builder.new do
    use Rack::Static, urls: [""], index: "index.html"
    run lambda { |env| [200, {'Content-Type' => 'text/plain'}, ['OK']] }
  end

  Rack::Server.start(app: app)
end


namespace :jogger do
  DUMP_FILE = "20160229_1842_teamon.xml"

  desc "Import posts from jogger"
  task :import do
    require "nokogiri"
    require "date"
    require "yaml"

    # Create ./archive directory
    dir = File.expand_path("../archive", __FILE__)
    FileUtils.mkdir_p(dir)

    # Load jogger dump file
    doc = File.open(DUMP_FILE) { |f| Nokogiri::XML(f) }

    doc.xpath("/jogger/entry").each do |entry|
      # Fetch info from XML
      title     = entry.xpath("subject").text
      permalink = entry.xpath("permalink").text
      body      = entry.xpath("body").text
      tags      = entry.xpath("tags").text.split(",").map(&:strip)
      date      = Date.parse(entry.xpath("date").text)
      filename  = File.join(dir, "#{date.strftime("%Y-%m-%d")}-#{permalink}.html")

      # Replace geshi with jekyll syntax highlight
      # e.g {geshi lang=bash} ... {/geshi} into {% highlight ruby %} ... {% endhighlight %}
      body.gsub!(/\{geshi\s+lang=([^}]+?)\}(.+?)\{\/geshi\}/m) do
        lang = $1
        code = $2
        lang.gsub!(/[^a-z]/, "") # leave only a-z chars

        "{% highlight #{lang} %}#{code}{% endhighlight %}"
      end


      # Prepare YAML frontmatter
      meta = {
        "title"     => title,
        "permalink" => ["/archive", date.strftime("%Y/%m/%d"), permalink].join("/"),
        "tags"      => tags,
        "layout"    => "archive"
      }

      # Create html file
      puts "Writing #{filename}"
      File.open(filename, "w") do |f|
        f.puts YAML.dump(meta)
        f.puts "---"
        f.puts
        f.puts body
      end
    end
  end
end
