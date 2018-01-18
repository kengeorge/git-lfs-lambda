#!/bin/bash -e

functionRoot="src/functions"
functionFolders=`ls $functionRoot`
commonRoot="src/common"

for functionname in $functionFolders; do
    outfile="tmp/deploymentPackage-$functionname.zip"
    if [ -e "./$outfile" ]; then
        rm $outfile
    fi

    echo "Packaging function $functionname"
    fullfolder="$PWD/$functionRoot/$functionname"
    fulloutfile=$PWD/$outfile

    # COMMON FILES
    pushd src
    zip $fulloutfile common/*.js
    popd

    # FUNCTION FILES
    pushd $functionRoot/$functionname
    zip -g $fulloutfile ./*
    popd


    unzip -l $fulloutfile
    uploadCmd="aws lambda update-function-code --function-name $functionname --zip-file fileb://$fulloutfile"
    echo "$uploadCmd"
    $uploadCmd
done

# tar -czvf $OUTFILE ./lambda/* # can't get tar to work
#cd lambda
#zip -r ../$OUTFILE * -x .*
#aws lambda update-function-code --function-name gatewayTest --zip-file "fileb://$FULLNAME"
