var gulp = require('gulp');
var download = require('gulp-download');
var cheerio = require('gulp-cheerio');
var cleanCSS = require('gulp-clean-css');
var uglify = require('gulp-uglify');
var concat = require('gulp-concat');
const packageFolder = 'dist/';
const staticAssetsFolder = 'assets';

gulp.task('download', function () {
    return gulp.src('index.html')
        .pipe(cheerio(function ($, file) {
            $('link[rel="stylesheet"], script[src], img[src]').each(function () {
                var url = $(this).attr('href') || $(this).attr('src');
                if (url && url.startsWith('http')) {
                    var fileName = url.split('/').pop();
                    download(url).pipe(gulp.dest(`${packageFolder}/${staticAssetsFolder}`));
                    if ($(this).attr('href')) {
                        $(this).attr('href', staticAssetsFolder + '/' + fileName);
                    } else if ($(this).attr('src')) {
                        $(this).attr('src', staticAssetsFolder + '/' + fileName);
                    }
                }
            });
        }))
        .pipe(gulp.dest(packageFolder));
});

gulp.task('minify-css', function () {
    return gulp.src('assets/*.css')
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(concat('styles.min.css'))
        .pipe(gulp.dest(packageFolder + staticAssetsFolder));
});

gulp.task('minify-js', function () {
    return gulp.src('assets/*.js')
        .pipe(uglify())
        .pipe(concat('scripts.min.js'))
        .pipe(gulp.dest(packageFolder + staticAssetsFolder));
});

gulp.task('default', gulp.series('download', 'minify-css', 'minify-js'));
