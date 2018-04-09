const gll = require('./base.js');
const cloud = new gll.configuredAWS.CloudFormation();

const K = require('kpromise');
const tap = K.tap;

exports.createChangeSet = (templateText, config) => {
    const params = {
        TemplateBody: templateText,
        StackName: config.stackName,
        ChangeSetName: config.changeSetName,
        ChangeSetType: 'CREATE',
        Capabilities: ['CAPABILITY_IAM'],
        Parameters: [
            {
                ParameterKey: 'artifactsBucketName',
                ParameterValue: config.bucketName
            },
            {
                ParameterKey: 'endpoint',
                ParameterValue: config.endpoint
            },
        ]
    };
    return cloud.createChangeSet(params).promise()
        .then(tap((response) => cloud.waitFor('changeSetCreateComplete', {ChangeSetName: response.Id}).promise()))
};

exports.executeChangeSet = (changeSetResponse) =>
    cloud
        .executeChangeSet({ChangeSetName: changeSetResponse.Id}).promise()
        .then(() => cloud.waitFor('stackCreateComplete', {StackName: changeSetResponse.StackId}).promise());

exports.deleteStack = (stackName) =>
    cloud
        .deleteStack({StackName: stackName}).promise()
        .then(() => cloud.waitFor('stackDeleteComplete', {StackName: stackName}).promise());

