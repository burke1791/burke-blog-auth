const AWS = require('aws-sdk');

module.exports.invalidate = (e, ctx, cb) => {
  const cloudfront = new AWS.CloudFront();

  const params = {
    DistributionId: process.env.CLOUDFRONT_ID,
    InvalidationBatch: {
      CallerReference: Date.now().toString(),
      Paths: {
        Quantity: 1,
        Items: [
          '/*'
        ]
      }
    }
  };

  cloudfront.createInvalidation(params, (err, data) => {
    cb(null, { statusCode: 200 });
  });
};