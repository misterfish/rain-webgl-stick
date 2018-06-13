var gulp = require('gulp'),
  fs = require('fs'),
  source = require('vinyl-source-stream'),
  browserify = require('browserify'),
  uglify = require('gulp-uglify'),
  streamify = require('gulp-streamify'),
  babelify = require("babelify");
	gsap = require("gsap");
	glslify = require("glslify");

function compileJS(file){
  browserify('src/'+file+'.js',{debug:true})
    .transform('babelify', babelifyOpts ())
    .transform('glslify')
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(source('app.js'))
  // .pipe(streamify(uglify()))
    .pipe(gulp.dest('.'));
}

// gulp.task('default',['js1','js2','js3'],function(){});
gulp.task('default',['js1'],function(){});

gulp.task('js1',function(){
  compileJS('global');
});
// gulp.task('js2',function(){
//   compileJS('index2');
// });
// gulp.task('js3',function(){
//   compileJS('index3');
// });





function babelifyOpts () {
    return {
        presets: ["babel-preset-es2015", "stage-0"],
        plugins: [
            "babel-plugin-operator-overload",
            // --- useBuiltIns = use Object.assign directly.
            ["transform-object-rest-spread", { "useBuiltIns": true }],
            ["transform-runtime", {
                "polyfill": false,
                "regenerator": true
            }],
        ],
    }
}
