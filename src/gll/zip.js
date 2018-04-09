const fs = require('fs');
const paths = require('./paths');
const archiver = require('archiver');
const K = require('kpromise');
const log = K.log;
const promise = K.promise;

/**
 * Zip the required deployment artifacts for the given function name.
 *
 * @param functionName
 * @returns {*}
 */
function zip(functionName) {
    return promise((res, rej) => {

        const deploymentPackage = paths.deploymentPackageFor(functionName);
        const archive = startArchive(deploymentPackage, res, rej);

        archive.file(paths.apiFile(functionName),
            {name: functionName + ".js"}
        );

        //TODO not all functions need all common/modules dependencies; could split to reduce deployment size
        archive.directory(paths.apiCommon(), 'common');
        archive.directory(paths.apiModules(), 'node_modules');
        archive.finalize();
    });
}

function startArchive(archiveLocation, res, rej) {
    const archive = archiver('zip');

    const output = fs.createWriteStream(archiveLocation);
    output.on('end', function() {
        log("Done writing for %s", archiveLocation);
    });
    output.on('close', function() {
        res({
            location: archiveLocation,
            size: archive.pointer()
        });
    });

    archive.on('warning', function(warn) {
        if(warn.code === 'ENOENT') {
            log("Archiver - Error No Entity warning: %s", warn);
        } else {
            rej(new Error(warn));
        }
    });
    archive.on('error', function(err) {
        log("Error writing zip file %s: %s", archiveLocation, err);
        rej(new Error(err));
    });

    archive.pipe(output);
    return archive;
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
