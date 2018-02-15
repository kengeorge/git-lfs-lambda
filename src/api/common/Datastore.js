class Datastore {
    constructor() {
        if (this.constructor === Datastore) {
            throw new TypeError("Cannot instantiate abstract class Datastore.")
        }
    }

    getUploadUrl(key) {
        throw new TypeError("Not implemented.");
    }

    getDownloadUrl(key) {
        throw new TypeError("Not implemented.");
    }

    getVerifyUrl(key) {
        throw new TypeError("Not implemented.");
    }

    exists(key) {
        throw new TypeError("Not implemented.");
    }
}

module.exports = Datastore;
