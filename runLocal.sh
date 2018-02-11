#!/bin/bash

templateName=template.yaml
testTemplateName=localTemplate.ignore.yaml
repoName=localtest
apiDir="./src/api"
params="bucketName=cloudrepo-git-lfs-lambda"
templateCmd="./src/gll/apiGen.js compile-template $repoName --local"

$templateCmd > $apiDir/$testTemplateName
sam local start-api --template $apiDir/$testTemplateName --parameter-values $params

