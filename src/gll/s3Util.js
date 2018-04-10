const AWS = require('aws-sdk');

let s3;
exports.configure = (config) => s3 = new AWS.S3({region: config.awsRegion});

exports.checkBucket = (bucketName) => s3.waitFor('bucketExists', {Bucket: bucketName}).promise();

exports.deleteBucket = (bucketName) => {
    const params = {Bucket: bucketName};
    return s3.deleteBucket(params).promise()
        .then(() => s3.waitFor('bucketNotExists', params).promise());
};

exports.put = (fileBits, bucketName, fileName) => {
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
    const params = {
        Bucket: bucketName,
        ACL: 'private',
    };
    return s3.createBucket(params).promise()
        .then(() => exports.checkBucket(bucketName))
    ;
};
