const gll = require('./base.js');
const cloud = new gll.configuredAWS.CloudFormation();

const K = require('kpromise');

exports.createChangeSet = function(templateText, config) {
    const exists = false;

    const params = {
        TemplateBody: templateText,
        StackName: config.stackName,
        ChangeSetName: config.changeSetName,
        ChangeSetType: exists ? 'UPDATE' : 'CREATE',
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
            {
                ParameterKey: 'bucketName',
                ParameterValue: config.bucketName
            },
        ]
    };
    /*
    for(var name in config.lambdaFunctions) {
        params.Parameters.push({
            ParameterKey: name + "Uri",
            ParameterValue: config.lambdaFunctions[name]
        });
    }
    */
    return cloud.createChangeSet(params).promise()
        .then(get('Id'))
        .then((id) => {
            return cloud.waitFor('changeSetCreateComplete', {ChangeSetName: id}).promise();
        })
};

exports.executeChangeSet = function(changeSetResponse){
    const params = {
        ChangeSetName: changeSetResponse.Id,
    };
    return cloud.executeChangeSet(params).promise()
        .tap(function() {
            const params = {
                StackName: changeSetResponse.StackId
            };
            return cloud.waitFor('stackCreateComplete', params).promise();
        });
};

exports.deleteStack = function(stackName) {
    const params = {
        StackName: stackName
    };
    return cloud.deleteStack(params).promise()
        .tap(function() {
            return cloud.waitFor('stackDeleteComplete', params).promise();
        });
};

