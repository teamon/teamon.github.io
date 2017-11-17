all: help

install: ## Install dependencies
	which ruby || asdf install
	which bundle || gem install bundler
	bundle install

start: ## Start development server at port 4444
	bundle exec jekyll server --livereload --watch --future --port 4444

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
