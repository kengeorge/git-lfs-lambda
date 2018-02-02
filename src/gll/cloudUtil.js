const Q = require('Q');
Q.longStackSupport = true;

const gll = require('./base.js');
const cloud = new gll.configuredAWS.CloudFormation();
const format = require('util').format;
const qutils = require('./qutils.js')

exports.createChangeSet = function(templateText, deploymentBucketName, repoName) {
    var stackName = format("git-lfs-lambda-%s-stack", repoName);
    var changeSetName = 'gllTestChangeSet';
    //var exists = CheckForExisting(stackName, changeSetName);
    var exists = false;
    var params = {
        TemplateBody: templateText,
        StackName: stackName,
        ChangeSetName: changeSetName,
        ChangeSetType: exists ? 'UPDATE' : 'CREATE',
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
            {
                ParameterKey: 'deploymentBucketName',
                ParameterValue: deploymentBucketName
            },
        ]
    };
    return cloud.createChangeSet(params).promise()
        .tap(function (response) {
            var params = {ChangeSetName: response.Id};
            return cloud.waitFor('changeSetCreateComplete', params).promise();
        });
};

exports.executeChangeSet = function(changeSetResponse){
    var params = {
        ChangeSetName: changeSetResponse.Id,
    };
    return cloud.executeChangeSet(params).promise()
        .tap(function() {
            var params = {
                StackName: changeSetResponse.StackId
            };
            return cloud.waitFor('stackCreateComplete', params).promise();
        });
};

exports.deleteStack = function(stackName) {
    var params = {
        StackName: stackName
    };
    return cloud.deleteStack(params).promise();
};

