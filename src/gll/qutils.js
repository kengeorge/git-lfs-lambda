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
            calls.push(makeCall(callFunc, k, input[k]));
        }
        return Q.all(calls);
    };
};

function makeCall(func, k, v) {
    return Q.fcall(function() {
        return func(k, v);
    });
};


exports.promiseFor = function(value) {
    return Q.fcall(function(){
        return value;
    });
};

/**
 * Forks (i.e., calls tap) using only the specified subset of data
 * This is basically just a sugar for .tap(function(d){ Q(d).get('fieldName')...)
 * i.e. {one: 1, two: 2} -> using('one', function(data) {...} -> data == 1
 *
 * Will also pull multiple fields as an object
 * i.e. {one: 1, two: 2, three: 3} -> using('one', 'two', function(data) {...}
 * -> data == {one: 1, two: 2}
 */
exports.using = function() {
    var varArgs = Array.from(arguments);
    var func = varArgs.pop();
    if(varArgs.length == 1) {
        return function(input) {
            return Q(input)
                .get(varArgs[0])
                .then(func)
            ;
        }
    }

    if(varArgs.length > 1) {
        return function(input) {
            return Q(input)
                .pull(varArgs)
                .then(func)
            ;
        };
    }
};

/**
 * Takes input values (array) and maps the results of the given handler to an
 * object with the initial value as its key.
 * i.e. ['one', 'two'] -> keyMap(parseToInt) -> {one: 1, two: 2}
 *
 */
exports.keyMap = function(handlerFunc) {
    return function (inputArray) {
        var ret = {};
        return Q(inputArray)
            .then(exports.forEach(function(key, value){
                var result = handlerFunc(key, value);
                if(!result || !result.then) {
                    ret[key] = result;
                    return;
                }
                return result.then(function(r){
                    ret[key] = r;
                })
            }))
            .then(function(){
                return ret;
            })
    };
};

exports.forEach = function(callFunc) {
    return function(input) {
        if (Array.isArray(input)) return exports.forEachItem(callFunc)(input);
        else return exports.forEachField(callFunc)(input);
    };
};

/**
 * Takes input and returns the given fields as key:value pairs.
 * i.e. {one: 1, two: 2} -> pull('one') -> {one: 1}
 */
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

/**
 * Takes input key:value pairs and returns the given mapping fields, using the mapping
 * field's value as a key into the input.
 * i.e. {one: 1, two: 2} -> map({valueIWant: 'two'}) -> {valueIWant: 2}
 */
exports.map = function(mapping){
    return function(input) {
        var ret = {};
        for(var mapKey in mapping) {
            var mapVal = mapping[mapKey];
            ret[mapKey] = input[mapVal];
        }
        return ret;
    };
};

/**
 * Takes input and returns the values of the given fields as an array.
 * Useful before calling .spread
 * i.e. {one: 1, two:2, three: 3} -> list('one', 'three') -> [1, 3]
 */
exports.list = function() {
    var fieldNames = Array.from(arguments);
    return function(input) {
        var ret = [];
        for(var i in fieldNames) {
            var fieldName = fieldNames[i];
            ret.push(input[fieldName]);
        }
        return ret;
    };
};

/**
 * Assigns the result of the handler ot the given field of the input.
 * Can be called from tap or then equivalently.
 * i.e. {one: 1, two: 2} -> decorate('three', function(){return 3;} -> {one: 1, two: 2:, three: 3}
 */
exports.decorate = function(fieldName, handlerFunc) {
    return function (input) {
        return handlerFunc(input)
            .then(function (results) {
                input[fieldName] = results;
                return input;
            });
    };
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

/**
 * Just wraps a thing. I think there's a better way to do this, but so far
 * this is the best fitting way I've found.
 */
exports.value = function(val) {
    return function() {
        return Q(val);
    };
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
