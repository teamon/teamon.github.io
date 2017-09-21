all: help

install: ## Install dependencies
	bundle install

start: ## Start development server at port 4000
	bundle exec jekyll server --livereload --watch

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'
