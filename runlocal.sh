#!/bin/bash

template=template.yaml
repoName=localRepo
outTemplate=./tmp/converted.yaml

sed s/\$\{repoName\}/$repoName/g $template > $outTemplate
sam local start-api -t $outTemplate
