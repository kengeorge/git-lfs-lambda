#!/bin/bash

template=template.yaml
repoName=localtest
outDir="./tmp"
outTemplate=$outDir/converted.yaml
funcDir="./src/functions"
commonDir="./src/common"

samDir=$outDir/sam
if [ -d $samDir ]; then
    echo "Removing old $samDir..."
    rm -rf $samDir
fi
mkdir -p $samDir
echo "Copying SAM template..."
sed s/\$\{repoName\}/$repoName/g $template > $samDir/$template

commonOutDir=$samDir/common
if [ -d $commonOutDir ]; then
    echo "Removing old $commonOutDir..."
    rm -rf $commonOutDir
fi
echo "Copying $commonDir to $commonOutDir..."
mkdir -p  $commonOutDir
cp -R $commonDir/ $commonOutDir/

names=`ls $funcDir`
for name in $names; do
    funcSrcDir=$funcDir/$name
    echo "Copying $funcSrcDir to $samDir..."
    cp -R $funcSrcDir/ $samDir/
done

sam local start-api -t $samDir/template.yaml

