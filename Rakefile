ENTRY = File.join(File.dirname(__FILE__), "lib/ap-ajaxify.es6")
ENTRY_ROUTER = File.join(File.dirname(__FILE__), "lib/router/ap-router-ajaxify.es6")

DIST = File.join(File.dirname(__FILE__), "dist/ap-ajaxify")
DIST_ROUTER = File.join(File.dirname(__FILE__), "dist/router/ap-router-ajaxify")

task :eslint do
  sh "eslint #{ENTRY}"
  # sh "eslint #{ENTRY_ROUTER}"
end

task :browserify => [:eslint] do
  sh "browserify #{ENTRY} -t babelify -o #{DIST}.js"
  # sh "browserify #{ENTRY_ROUTER} -t babelify -o #{DIST_ROUTER}.js"
end

task :uglify => [:eslint, :browserify] do
  sh "uglifyjs #{DIST}.js -o #{DIST}.min.js"
  # sh "uglifyjs #{DIST_ROUTER}.js -o #{DIST_ROUTER}.min.js"
end

task :build => [:eslint, :browserify, :uglify]
task :default => :build
