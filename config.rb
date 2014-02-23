require "slim"

activate :blog do |blog|
  blog.default_extension  = ".md"
  blog.summary_separator  = /(READMORE)/

  blog.permalink          = "/:year/:title"
  blog.sources            = "blog/:title.html"

  blog.summary_separator = /(READMORE)/

  blog.paginate           = true
  blog.per_page           = 10
  blog.page_link          = "page/:num"
end

page "/feed/atom",  layout: false
page "blog/*",      layout: :blog

# activate :directory_indexes
activate :automatic_image_sizes
activate :livereload
activate :syntax
activate :autoprefixer

set :markdown_engine, :redcarpet
set :markdown, {
  gh_blockcode: true,
  fenced_code_blocks:   true,
  smartypants:          true,
  no_intra_emphasis:    true,
  autolink:             true,
  space_after_headers:  true
}


###
# Page options, layouts, aliases and proxies
###

# Per-page layout changes:
#
# With no layout
# page "/path/to/file.html", :layout => false
#
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
#
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy pages (http://middlemanapp.com/basics/dynamic-pages/)
# proxy "/this-page-has-no-template.html", "/template-file.html", :locals => {
#  :which_fake_page => "Rendering a fake page with a local variable" }

###
# Helpers
###


# Methods defined in the helpers block are available in templates
# helpers do
#   def some_helper
#     "Helping"
#   end
# end

set :css_dir,     'assets/stylesheets'
set :js_dir,      'assets/javascripts'
set :images_dir,  'assets/images'

# Build-specific configuration
configure :build do
  activate :minify_html
  activate :minify_css
  activate :minify_javascript

  activate :asset_hash
  activate :relative_assets
end
