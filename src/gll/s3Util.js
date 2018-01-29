const Q = require('Q');
Q.longStackSupport = true;

const qutils = require('./qutils.js');

const gll = require('./base.js');
const s3 = new gll.configuredAWS.S3();


exports.checkBucket = function(bucketName) {
    return s3.waitFor('bucketExists', {Bucket: bucketName}).promise();
};

exports.headBucket = function(bucketName) {
    gll.log("Checking for %s", bucketName);
    return s3.headBucket({Bucket: bucketName}).promise()
        .tap(gll.log);
};

exports.listBuckets = function() {
    return s3.listBuckets().promise();
};

exports.getOrCreateBucket = function(bucketName) {
    var params = {
        Bucket: bucketName,
    };
    return s3.getBucketAcl(params).promise()
        .catch(function (err) {
            gll.log("Response: ", err);
            gll.log("Could not find bucket %s, creating...", bucketName);
            params.ACL = 'private';
            return s3.createBucket(params).promise();
        })
    ;
};
