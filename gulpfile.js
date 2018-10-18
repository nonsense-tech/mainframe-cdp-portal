const exec = require('child_process').exec;
const fs = require('fs');
const gulp = require('gulp');
// const ghPages  = require('gulp-gh-pages');
const surge = require('gulp-surge');
const env = require('gulp-env');
const s3 = require('gulp-s3-upload')({ useIAM: false }, { maxRetries: 5 });
const cloudfront = require('gulp-cloudfront-invalidate');
const log = require('fancy-log');

env({ file: ".env", type: "ini" });

// gh-pages
// gulp.task('deploy-gh-pages', () => {
//   require('fs').writeFileSync('./build/CNAME', 'cdp.makerdao.com');
//   return gulp.src('./build/**/*').pipe(ghPages());
// });

gulp.task('aws-s3-upload', () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new Error('Missing AWS auth credentials in env variables');
  if (!process.env.AWS_DEPLOY_S3_BUCKET) throw new Error('No S3 bucket specified in env variable');
  log(`Uploading to S3 bucket ${process.env.AWS_DEPLOY_S3_BUCKET}...`);
  return gulp.src("./build/**", "!**/.DS_Store")
  .pipe(s3({
    Bucket: process.env.AWS_DEPLOY_S3_BUCKET,
    ACL: 'public-read'
  }, {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }));
});

gulp.task('aws-cloudfront-invalidate', () => {
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) throw new Error('Missing AWS auth credentials in env variables');
  if (!process.env.AWS_DEPLOY_CLOUDFRONT_DISTRIBUTION_ID) throw new Error('No CloudFront distribution id specified in env variable');
  log(`Invalidating CloudFront cache for /index.html...`);
  return gulp.src('*')
  .pipe(cloudfront({
    distribution: process.env.AWS_DEPLOY_CLOUDFRONT_DISTRIBUTION_ID,
    paths: ['/index.html'],
    wait: true,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }));
});

gulp.task('deploy-aws', gulp.series('aws-s3-upload', 'aws-cloudfront-invalidate'));

gulp.task('deploy-surge-kovan', () => {
  require('fs').createReadStream('./build/index.html').pipe(fs.createWriteStream('./build/200.html'));
  return surge({ project: './build', domain: 'https://cdp-portal.surge.sh' });
});

gulp.task('deploy-surge-main', () => {
  require('fs').createReadStream('./build/index.html').pipe(fs.createWriteStream('./build/200.html'));
  return surge({ project: './build', domain: 'https://cdp-portal-mainnet.surge.sh' });
});
