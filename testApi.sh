#!/bin/bash

URI=`cat ./url`

echo "calling $URI"
curl -X POST "$URI" \
    -H 'x-amz-docs-region: us-west-2' \
    -d '{
        "garbage":"hi"
    }'
