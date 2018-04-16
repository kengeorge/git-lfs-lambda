# Git LFS Lambda
Git-lfs-lambda (GLL for short) is intended to be an easy, push-button solution to deploying a [git-lfs](https://git-lfs.github.com/) endpoint for a git repo. It uses [AWS Lambda](https://aws.amazon.com/lambda/) and [AWS API Gateway](https://aws.amazon.com/api-gateway/) to handle requests and instructs the git lfs client to store binary files in [AWS S3](https://aws.amazon.com/s3/). The actual server implementation is in a [separate project](https://github.com/kengeorge/git-lfs-lambda-server); this project focuses on the deployment of a service instance.

# Caution!
This project is not production ready. Using the create command will generate a production stack that does not implement any form of authorization or authentication. This means that anyone with the REST API endpoint url can use it to store files in your S3 bucket. This will eventually be corrected, but in the meantime use at your own risk!

If you need a temporary solution that is less risky, the [core server code project](https://github.com/kengeorge/git-lfs-lambda-server) contains instructions on how to use it locally, independent of a full AWS deployment.


## Getting Started

Install by cloning this repository or via NPM with:
```bash
npm install git-lfs-lambda
```

The [gll](gll) script in the root directory is the primary entry point, and currently features two commands.


### Create
```bash
gll create myRepoName
```
This will create and deploy the entire git-lfs-lambda server setup, configured for a repo named 'myRepoName'. The primary AWS artifacts that will be created are:

* S3 bucket: myRepoName-git-lfs-lambda
    * The primary artifacts bucket where the repo's binary files will go.
* S3 bucket: myRepoName-git-lfs-lambda-deployment
    * Another S3 bucket used in the deployment of the service. If desired, this can be removed once the deployment is complete.
* Lambda functions: myRepoName-git-lfs-lambda-*
    * There are 6 lambda functions in total. 5 as part of the [git-lfs server spec](https://github.com/git-lfs/git-lfs/blob/master/docs/spec.md) and an additional one to serve the optional 'verify' action.
* REST API: myRepoName-git-lfs-lambda-stack
    * The API Gateway endpoints for the git-lfs functions.
* CloudFormation stack: myRepoName-git-lfs-lambda-stack
    * Entire service stack entity. 
 
Details on other minor artifacts such as IAM roles and permissions can be found in the CloudFormation stack details.

### Delete
```bash
gll delete myRepoName
```

Delete will attempt to remove the entire git-lfs-lambda stack, as well as the deployment bucket. For safety, no non-empty buckets will be removed.

## Built With

* [git-lfs-lambda-server](https://github.com/kengeorge/git-lfs-lambda-server) - The server code portion of this project
* [commander](https://github.com/tj/commander.js) - A very nice little tool for making CLIs in Javascript
* [git-lfs](https://git-lfs.github.com/) - Large file storage solution for Git
* [NodeJS](https://nodejs.org/) - It's a love/hate thing
* [AWS CloudFormation](https://aws.amazon.com/cloudformation/) - A service for deploying services
* [AWS SAM](https://github.com/awslabs/serverless-application-model) - Makes the service for deploying services deploy services a little more easily
* [AWS SAM Local](https://github.com/awslabs/aws-sam-local) - local SAM environment
* [jest](https://facebook.github.io/jest/) - JS testing

## Contributing

There's lots to do, go for it.

## Versioning

GLL uses [SemVer](http://semver.org/) for versioning. For the versions available, see the [releases page](https://github.com/kengeorge/git-lfs-lambda/releases)

## Authors

* **[Ken George](https://github.com/kengeorge/)** - project creator
* **[Other Contributors](https://github.com/kengeorge/git-lfs-lambda/contributors/)**

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
