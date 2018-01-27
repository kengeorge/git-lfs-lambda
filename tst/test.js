#!/usr/bin/env node
const program = require('commander');
const format = require('util').format;

const qutils = require('../src/gll/qutils.js');
const read = qutils.read;
const passTo = qutils.passTo;

const test = require('./util/testUtil.js');
const gll = require('../src/gll/base.js');
const log = gll.log;
const pretty = gll.pretty;

program.version(gll.projectConfig.version);

/*
program
    .command('test [repoName]')
    .description("Call API Gateway's test method.")
    .action(function(repoName, options) {
        var apiName = format("git-lfs-lambda-%s", repoName);
        var resourcePath = format("/%s.git/info/lfs/locks", repoName);
        var method = "POST";

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
*/

program
    .command('test <repoName> <resource>')
    .description("Call API Gateway's test method on the batch resource.")
    .action(function(repoName, options) {
        return test.batch(repoName)
            .done();
    })
;

program
    .command('*')
    .action(function(env){
        console.log("Not a valid command!");
        program.outputHelp();
    })
;

program.parse(process.argv);

if(process.argv.slice(2).length <= 0) {
    console.log("No valid command found.");
    program.outputHelp();
}
