#!/bin/bash

templateName=template.yaml
testTemplateName=localTemplate.ignore.yaml
envFileName=localEnvVars.ignore.json
apiDir="./src/api"

repoName=cloudrepo
bucketName="$repoName-git-lfs-lambda"
params="bucketName=$bucketName"
templateCmd="./src/gll/apiGen.js compile-template $repoName --local"

$templateCmd > $apiDir/$testTemplateName
echo "{\"batch\":{\"GLL_ARTIFACTS_BUCKET\": \"$bucketName\"}}" > $apiDir/$envFileName
sam local start-api --template $apiDir/$testTemplateName --parameter-values "$params" --env-vars $apiDir/$envFileName
