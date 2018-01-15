#!/bin/bash

curl  -X POST \
    'https://8myudhff94.execute-api.us-west-2.amazonaws.com/test/something' \
    -H 'content-type: application/json' \
    -H 'x-amz-docs-region: us-west-2' \
    -d '{
    }'
