#!/usr/bin/env node
const program = require('commander');

const qutils = require('../src/gll/qutils.js');
const read = qutils.read;
const passTo = qutils.passTo;

const test = require('./util/testUtil.js');
const gll = require('../src/gll/base.js');
const log = gll.log;
const pretty = gll.pretty;

const lfs = {
    locks: {
        create: {
            path: "/locks",
            method: "POST",
            payload: {
                path: "foo/bar.zip",
                ref: {
                    name: "refs/heads/my-feature"
                }
            },
            response: {
                code: 201,
                body: {
                    lock: {
                        id: "some-uuid",
                        path: "/path/to/file",
                        locked_at: "2016-05-17T15:49:06+00:00",
                        owner: {
                            name: "Jane Doe",
                        }
                    }
                }
            },
            error: {
                exists: {
                    response: {
                        code: 409,
                        body: {
                            "lock": {
                                // details of existing lock
                            },
                            "message": "already created lock",
                            "documentation_url": "https://lfs-server.com/docs/errors",
                            "request_id": "123"
                        }
                    }
                },
                unauthorized: {
                    code: 403,
                    body: {
                        "message": "You must have push access to create a lock",
                        "documentation_url": "https://lfs-server.com/docs/errors",
                        "request_id": "123"
                    }
                },
                internal: {
                    code: 500,
                    body: {
                        "message": "internal server error",
                        "documentation_url": "https://lfs-server.com/docs/errors",
                        "request_id": "123"
                    }
                }
            }
        }
    },
    batch: {
        path: "/objects/batch",
        payload: {}
    }
};

program.version(gll.projectConfig.version);

program
    .command('test [api] [resourcePath] [method]')
    .description("Call API Gateway's test method.")
    .action(function(apiName, resourcePath, method, options) {
        test.gateway(apiName, resourcePath, method, lfs.locks.create.payload)
            .then(qutils.peek)
            .then(read('body'))
            .then(passTo(JSON.parse))
            .then(function(response){
                log("Test %s call to %s/ROOT%s with payload\n%s",
                    method, apiName, resourcePath, pretty(lfs.locks.create.payload));
                log("Response body:\n%s", pretty(response))
            })
            .done()
        ;
    });
;

program
    .command('*')
    .action(function(env){
        console.log("No valid command found.")
        program.outputHelp();
    });

program.parse(process.argv);
