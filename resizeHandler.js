// dependencies
var async = require('async');
var AWS = require('aws-sdk');
var gm = require('gm')
		.subClass({ imageMagick: true }); // Enable ImageMagick integration.
//var util = require('util');
//var query = require('querystring');

var s3 = new AWS.S3();

var bucketName = process.env.BUCKET_NAME;
var srcPath = process.env.UPLOAD_PREFIX;
var dstPath = process.env.OUTPUT_PREFIX;

exports.resize = function(event, context, callback) {
	//debug
	console.log(event['Records'][0]['Sns']['Message']);
	var MAX_WIDTH  = process.env.MAX_X;

	snsMessage = JSON.parse(event['Records'][0]['Sns']['Message']);

	sourceRecords = snsMessage['Records'];

	sourceRecords.forEach(function(record){
		var srcKey = record['s3']['object']['key'];
		var dstKey = dstPath + srcKey.replace(srcPath, '');

// Download the image from S3, transform, and upload to a different S3 bucket.
		async.waterfall([
			function download(next) {
				// Download the image from S3 into a buffer.
				console.log("Fetching Image from S3");
				s3.getObject({
					Bucket: bucketName,
					Key: srcKey
				}, next);
			},
			function transform(response, next) {
				console.log("Graphics Magic tranformation")
				gm(response.Body).size(function(err, size) {
					var scalingFactor = MAX_WIDTH / size.width;
					var width  = scalingFactor * size.width;
					var height = scalingFactor * size.height;

					// Transform the image buffer in memory.
					this.resize(width, height)
						.define("jpeg:extent=" + process.env.OUTPUT_SIZE + "KB")
						.toBuffer('JPG', function(err, buffer) {
							if (err) {
								next(err);
							} else {
								next(null, response.ContentType, buffer);
							}
						});
				});
			},
			function upload(contentType, data, next) {
				console.log("uploading image to s3")
				// Stream the transformed image to a different S3 bucket.
				s3.putObject({
					Bucket: bucketName,
					Key: dstKey,
					Body: data,
					ContentType: contentType
				}, next);
			}
		], function (err) {
			if (err) {
				console.error(
					'Unable to resize ' + bucketName + '/' + srcKey +
						' and upload to ' + bucketName + '/' + dstKey +
						' due to an error: ' + err
				);
			} else {
				console.log(
					'Successfully resized ' + bucketName + '/' + srcKey +
						' and uploaded to ' + bucketName + '/' + dstKey
				);
				context.succeed({
					location : bucketName + dstKey
				});
			}

			callback(null, "message");
		});
	});

};
