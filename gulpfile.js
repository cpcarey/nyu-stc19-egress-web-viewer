const gulp = require('gulp');
const connect = require('gulp-connect');

gulp.task('build', gulp.series(async function(done) {
  done();
}));

gulp.task('webserver', gulp.series(async function() {
  server = connect.server({
    port: 1234,
    https: false,
  });
}));

gulp.task('watch', gulp.parallel('build', 'webserver', async function() {
  const watchlist = [
  ];

  gulp.watch(watchlist, gulp.series('build'));
}));
