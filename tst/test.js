#!/usr/bin/env node
const program = require('commander');

const qutils = require('../src/gll/qutils.js');
const read = qutils.read;
const passTo = qutils.passTo;

const test = require('./util/testUtil.js');
const gll = require('../src/gll/base.js');
const log = gll.log;
const pretty = gll.pretty;

program.version(gll.projectConfig.version);

program
    .command('test [api] [resourcePath] [method]')
    .description("Call API Gateway's test method.")
    .action(function(apiName, resourcePath, method, options) {
        var payload = {
            path: "foo/bar.zip",
            ref: {
                name: "refs/heads/my-feature"
            }
        };
        test.gateway(apiName, resourcePath, method, payload)
            .then(read('body'))
            .then(passTo(JSON.parse))
            .then(function(response){
                log("Test %s call to %s/ROOT%s with payload\n%s",
                    method, apiName, resourcePath, pretty(payload));
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
