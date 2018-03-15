const gll = require('./base.js');
const s3 = new gll.configuredAWS.S3();

exports.checkBucket = function (bucketName) {
    return s3.waitFor('bucketExists', {Bucket: bucketName}).promise();
};

exports.headBucket = function (bucketName) {
    gll.log("Checking for %s", bucketName);
    return s3.headBucket({Bucket: bucketName}).promise()
        .tap(gll.log);
};

exports.listBuckets = function () {
    return s3.listBuckets().promise();
};

exports.getOrCreateBucket = function (bucketName) {
    return s3.getBucketAcl({Bucket: bucketName}).promise()
        .catch(function () {
            return createBucket(bucketName);
        })
        ;
};

exports.put = function (fileBits, bucketName, fileName) {
    const params = {
        Bucket: bucketName,
        Key: fileName,
        ACL: 'private',
        Body: fileBits
    };
    return s3.putObject(params).promise();
};

exports.createBucket = function (bucketName) {
    const params = {
        Bucket: bucketName,
        ACL: 'private',
    };
    return s3.createBucket(params).promise();
};
