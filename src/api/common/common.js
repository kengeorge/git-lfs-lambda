const format = require('util').format;

module.exports.log = function() {
    let formatted = format.apply(this, Array.from(arguments).map(module.exports.pretty));
    console.log(formatted);
};

module.exports.pretty = function(data) {
    if (typeof data === 'object') return JSON.stringify(data, null, 2);
    return data;
};
