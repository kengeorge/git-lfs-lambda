const AWS = require('aws-sdk');
const K = require('kpromise');
const filter = K.filter;
const get = K.get;
const tap = K.tap;

let cloud;
exports.configure = (config) => cloud = new AWS.CloudFormation({region: config.awsRegion});

exports.createChangeSet = config => {
    const params = {
        TemplateBody: config.template,
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

exports.getStackApiId = (stackName) =>
    cloud
        .listStackResources({StackName: stackName}).promise()
        .then(get('StackResourceSummaries'))
        .then(filter(resource => resource.LogicalResourceId === "ServerlessRestApi"))
        .then(get('0'))
        .then(get('PhysicalResourceId'))
;

exports.executeChangeSet = (changeSetResponse) =>
    cloud
        .executeChangeSet({ChangeSetName: changeSetResponse.Id}).promise()
        .then(() => cloud.waitFor('stackCreateComplete', {StackName: changeSetResponse.StackId}).promise());

exports.deleteStack = (stackName) =>
    cloud
        .deleteStack({StackName: stackName}).promise()
        .then(() => cloud.waitFor('stackDeleteComplete', {StackName: stackName}).promise());

