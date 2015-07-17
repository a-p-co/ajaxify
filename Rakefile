DIST = File.join(File.dirname(__FILE__), "dist/ap-ajaxify")
ENTRY = File.join(File.dirname(__FILE__), "lib/ap-ajaxify.js")

task :eslint do
  sh "eslint #{ENTRY}"
end

task :browserify => [:eslint] do
  sh "browserify #{ENTRY} -o dist/ap-ajaxify.js"
end

task :uglify => [:eslint, :browserify] do
  sh "uglifyjs #{DIST}.js -o #{DIST}.min.js"
end

task :build => [:eslint, :browserify, :uglify]
task :default => :build
