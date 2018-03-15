function replace(text, placeholderData) {
    for (var key in placeholderData) {
        var data = placeholderData[key];
        var pattern = new RegExp("\\$\\{" + key + "\\}");
        while (match = text.match(pattern)) {
            var token = match[0];
            if (data) text = text.replace(token, data);
        }
    }
    return text;
}

module.exports = replace;