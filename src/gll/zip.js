const fs = require('fs');
const paths = require('./paths');
const archiver = require('archiver');
const K = require('kpromise');
const log = K.log;
const promise = K.promise;

function zip(filename) {
    return promise((res, rej) => {

        log("zipping %s", filename)

        const deploymentPackage = paths.deploymentPackageFor(filename);

        const output = fs.createWriteStream(deploymentPackage);
        output.on('end', function() {
            log("Done writing for %s", deploymentPackage);
        });
        output.on('close', function() {
            log("%s zipped with %s bytes.", deploymentPackage, archive.pointer());
            res(deploymentPackage);
        });

        const archive = archiver('zip');
        archive.on('warning', function(warn) {
            if(warn.code === 'ENOENT') {
                log("Archiver - Error No Entity warning: %s", warn);
            } else {
                rej(new Error(warn));
            }
        });
        archive.on('error', function(err) {
            log("Error writing zip file %s: %s", deploymentPackage, err);
            rej(new Error(err));
        });

        archive.pipe(output);

        archive.file(paths.sourceFileForFunction(filename),
            {name: filename + ".js"}
        );
        archive.directory(paths.apiCommonRoot(), 'common');
        archive.directory(paths.apiNodeRoot(), 'node_modules');
        archive.finalize();
    });
}

function readZipBits(zipFile) {
    return promise((res, rej) => {
        fs.readFile(zipFile, null, (err, data) => {
            if(err) rej(err);
            else res(data);
        });
    });
}

module.exports = {
    zip: zip,
    readBits: readZipBits
};
