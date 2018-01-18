/***
 * From https://github.com/git-lfs/git-lfs/blob/master/docs/api/locking.md
 *
 Create Lock
 The client sends the following to create a lock by sending a POST to /locks (appended to the LFS server url, as described above). Servers should ensure that users have push access to the repository, and that files are locked exclusively to one user.

 path - String path name of the file that is locked. This should be relative to the root of the repository working directory.
 ref - Optional object describing the server ref that the locks belong to. Note: Added in v2.4.
 name - Fully-qualified server refspec.
 *
 */

'use strict';

exports.handler = function(body, context, callback) {
    var err = {
        sc: 501,
        m: "huh"
    };
    callback(err);
};
