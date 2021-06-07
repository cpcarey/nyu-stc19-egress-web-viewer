const gulp = require('gulp');
const chug = require('gulp-chug');
const connect = require('gulp-connect');

gulp.task('build-src', gulp.series(async function(done) {
  done();
}));

gulp.task('build-potree', async function(done) {
  gulp.src('./potree/gulpfile.js')
      .pipe(chug({
        tasks: ['build', 'pack'],
      }, function() {
        done();
      }));
});

gulp.task('webserver', gulp.series(async function() {
  server = connect.server({
    port: 1234,
    https: false,
  });
}));

gulp.task('watch', gulp.parallel('build-src', 'build-potree', 'webserver', async function() {
  const watchlistSrc = [
    './src/*',
  ];

  const watchlistPotree = [
    './potree/src/**/*',
  ];

  gulp.watch(watchlistSrc, gulp.series('build-src'));
  gulp.watch(watchlistPotree, gulp.series('build-potree'));
}));
