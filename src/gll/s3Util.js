const gll = require('./base.js');
const s3 = new gll.configuredAWS.S3();

exports.checkBucket = (bucketName) => s3.waitFor('bucketExists', {Bucket: bucketName}).promise();

exports.headBucket = (bucketName) => s3.headBucket({Bucket: bucketName}).promise();

exports.listBuckets = () => s3.listBuckets().promise();

exports.getOrCreateBucket = (bucketName) => {
    return s3.getBucketAcl({Bucket: bucketName}).promise()
        .catch(() => exports.createBucket(bucketName));
};

exports.deleteBucket = (bucketName) => {
    const params = {Bucket: bucketName};
    //TODO empty bucket
    return s3.deleteBucket(params).promise()
        .then(() => s3.waitFor('bucketNotExists', params).promise());
};

exports.put = (fileBits, bucketName, fileName) => {
    console.log(`Writing to ${bucketName} as ${fileName}`);
    const params = {
        Bucket: bucketName,
        Key: fileName,
        ACL: 'private',
        Body: fileBits
    };
    return s3.putObject(params).promise()
        .then(() => s3.waitFor('objectExists', {Bucket: bucketName, Key: fileName}).promise());
};

exports.createBucket = (bucketName) => {
    console.log("CREATING bucket " + bucketName);
    const params = {
        Bucket: bucketName,
        ACL: 'private',
    };
    return s3.createBucket(params).promise()
        .then(() => exports.checkBucket(bucketName))
        ;
};
