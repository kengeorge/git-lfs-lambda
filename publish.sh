#!/bin/bash -ex

OUTFILE=deploymentPackage.zip
FULLNAME=$PWD/$OUTFILE

if [ -e "$OUTFILE" ]; then
    rm $OUTFILE
fi

# tar -czvf $OUTFILE ./lambda/* # cna't get tar to work
cd lambda
zip -r ../$OUTFILE * -x .*
aws lambda update-function-code --function-name git-lfs-test --zip-file "fileb://$FULLNAME"
