#!/bin/bash

templateName=template.yaml
testTemplateName=localTemplate.ignore.yaml
repoName=localtest
apiDir="./src/api"
params="bucketName=cloudrepo-git-lfs-lambda"

sed s/\$\{repoName\}/$repoName/g $templateName > $apiDir/$testTemplateName

# cd $apiDir
sam local start-api --template $apiDir/$testTemplateName --parameter-values $params

