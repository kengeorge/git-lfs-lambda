const Q = require('Q');
const gll = require('./base.js')


exports.forEachItem = function(callFunc) {
    return function (input) {
        return Q.all(Array.from(input).map(function (item) {
            return callFunc(item);
        }));
    }
};

exports.forEachField = function(callFunc){
    return function(input) {
        var calls = [];
        for(var k in input) {
            calls.push(Q.fcall(function() {
                return callFunc(k, input[k]);
            }));
        }
        return Q.all(calls);
    };
};

exports.promiseFor = function(value) {
    return Q.fcall(function(){
        return value;
    });
};

exports.forEach = function(callFunc) {
    return function(input) {
        if (Array.isArray(input)) return exports.forEachItem(callFunc)(input);
        else return exports.forEachField(callFunc)(input);
    };
};

exports.pull = function(fieldName) {
    var varArgs = Array.from(arguments);
    return function (input) {
        return Q.fcall(function () {
            var ret = {};
            for (var i = 0; i < varArgs.length; i++) {
                var name = varArgs[i];
                ret[name] = input[name];
            }
            return ret;
        });
    };
};

exports.print = function(message) {
    return function(input) {
        gll.log(gll.pretty(message));
        return Q.fcall(function() {
            return input;
        });
    };
};

exports.populate = function(fieldName, handlerFunc) {
    return function (input) {
        return handlerFunc(input)
            .then(function (results) {
                input[fieldName] = results;
                return input;
            });
    };
};

exports.ret = function(input) {
    return function() {
        return input;
    }
};

exports.filter = function(filterFunc) {
    return function(input) {
        if(!Array.isArray(input)) {
            throw new Error("Cannot filter a non-array");
        }
        return Q.fcall(function(){
            var ret = [];
            for(var k in input){
                var item = input[k];
                if(filterFunc(item)) ret.push(item);
            }
            return ret;
        })
    }
};

exports.removeNulls = exports.filter(function (item) {
    return item != null && item != undefined;
});

exports.firstOrDefault = function(items) {
    return Q.fcall(function() {
        return items ? items[0] : null;
    });
};

exports.qify = function(items){
    return Q.all(items.map(function(item){
        return Q.fcall(function() {
            return item;
        })
    }));
};

exports.flatten = function(items) {
    return Q.fcall(function() {
        return flatten(items);
    });
};

function flatten(items){
    var ret = [];
    if(!items) return ret;
    for(var key in items) {
        var item = items[key];
        if(!Array.isArray(item)) {
            ret.push(item);
            continue;
        }
        var subitems = flatten(item);
        ret = ret.concat(subitems);
    }
    return ret;
}
