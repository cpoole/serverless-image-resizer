# serverless-image-resizer
serverless image resizer is a small serverless service used to resixe images placed in an S3 bucket.

# Dependencies:
This assumes you have already created a bucket, a bucket notification, and a sns topic external to this project. 

I manage these with terraform.

After creating these modify the env file to point to your bucket name and your arn topic

# Deploy:

`serverless deploy`


