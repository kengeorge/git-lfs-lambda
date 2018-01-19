const Q = require('Q');
const gll = require('./base.js')

exports.forEach = function(callFunc) {
    return function (input) {
        return Q.all(Array.from(input).map(function (item) {
            return callFunc(item);
        }));
    }
}

exports.read = function(fieldName) {
    return function(input) {
        return Q.fcall(function() {
            return input[fieldName];
        });
    }
}

exports.peek = function(input) {
    return Q.fcall(function() {
        gll.log(gll.pretty(input));
        return input;
    });
}

exports.filter = function(filterFunc) {
    return function(input) {
        return Q.fcall(function(){
            var ret = [];
            for(var k in input){
                var item = input[k];
                if(filterFunc(item)) ret.push(item);
            }
            return ret;
        })
    }
}

exports.qify = function(items){
    return Q.all(items.map(function(item){
        return Q.fcall(function() {
            return item;
        })
    }));
}

exports.passTo = function(){
    var varArgs = Array.from(arguments);
    return function() {
        var func = varArgs.shift();
        var theseArgs = Array.from(arguments);
        var all = theseArgs.concat(varArgs);
        all.unshift(func);
        return Q.fcall.apply(this, all);
    };
}
