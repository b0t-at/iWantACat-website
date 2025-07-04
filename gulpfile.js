var gulp = require('gulp');
var download = require('gulp-download');
var cheerio = require('gulp-cheerio');
const packageFolder = 'dist/';
const staticAssetsFolder = 'assets';

gulp.task('download', function () {
    return gulp.src('index.html')
        .pipe(cheerio(function ($, file) {
            $('link[rel="stylesheet"], link[rel="icon"], script[src], img[src]').each(function () {
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

gulp.task('copy-own-assets', function () {
    return gulp.src('assets/*')
        .pipe(gulp.dest(packageFolder + staticAssetsFolder));
});

gulp.task('copy-subpages', function () {
    return gulp.src(['*.html', '!index.html'])
        .pipe(gulp.dest(packageFolder));
});

gulp.task('default', gulp.series('download','copy-own-assets','copy-subpages'));

