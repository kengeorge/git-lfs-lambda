const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const Datastore = require('common/Datastore.js');

class S3Datastore extends Datastore {

    constructor(bucketName) {
        super();
        this.bucketName = bucketName;

        //Binding since promises won't call with 'this'
        this.getUrl = this.getUrl.bind(this);
        this.getUploadUrl = this.getUploadUrl.bind(this);
        this.getDownloadUrl = this.getDownloadUrl.bind(this);
        this.getVerifyUrl = this.getVerifyUrl.bind(this);
        this.exists = this.exists.bind(this);
    }

    getUrl(key, action, contentType) {
        return new Promise((resolve, reject) => {
            let params = {
                Bucket: this.bucketName,
                Key: key,
            };

            if(contentType) params.ContentType = contentType;

            return s3.getSignedUrl(action, params, function(err, data) {
                if(err) reject(err);
                else resolve(data);
            });
        });
    }

    getUploadUrl(key) {
        return this.getUrl(key, 'putObject', "application/octet-stream");
    }

    getDownloadUrl(key) {
        return this.getUrl(key, 'getObject');
    }

    getVerifyUrl(key) {
        //TODO a verify action response will initiate a post to the given url after the upload is completed.
        return super.getVerifyUrl(key);
    }

    exists(key, invert = false) {
        var params = {
            Bucket: this.bucketName,
            Key: key
        };
        //TODO
        return s3.headObject(params).promise()
            .then(function() {
                return invert ? null : item;
            })
            .catch(function() {
                return invert ? item : null;
            });
    }
}

module.exports = S3Datastore;
