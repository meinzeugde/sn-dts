var fs = require('fs');
var XMLHttpRequest = require('w3c-xmlhttprequest').XMLHttpRequest;
var argv = require('minimist')(process.argv.slice(2));
var configLoader = require('./lib/config.js'),
    config = {};

/**
 * Exit node app
 * @param code - optional node system code. Defaults to 1 for normal exit. Any other number means error.
 */
function exitApp(code) {
    code = typeof code == 'undefined' ? 1 : code;
    process.exit(code);
}

// entry point
function init() {
    try {
        configLoader.setConfigLocation(argv.config);
        config = configLoader.getConfig();
        var host = config.host;
        var auth = config.auth;
        var apiTables = config.tables;
        for (var i in apiTables) {
            download(host, auth, apiTables[i]);
        }
    } catch (error) {
        console.error(error);
        exitApp();
    }

}

function download(host, auth, table) {
    try {
        var url = 'https://' + host + '/api/79030/type_definition/glide_record/' + table;
        var client = new XMLHttpRequest();

        client.setRequestHeader('Accept', 'application/octet-stream');
        client.setRequestHeader('Content-Type', 'application/octet-stream');
        client.setRequestHeader('Authorization', 'Basic ' + auth);
        client.addEventListener('load', function(event) {
            var response = client.response;
            var contentType = client.getResponseHeader('Content-Type');
            if (contentType != 'application/octet-stream') {
                console.error('table ' + table + ' does not exist');
            } else {
                var filename = 'typings/servicenow-dts/GlideRecord/' + table + '.d.ts';
                var fileStream = fs.createWriteStream(filename);
                fileStream.write(client.response);
                fileStream.end();
                console.info('created file ' + filename);
            }
        }, false)
        client.open('GET', url);

        client.send();
        console.log('requesting...' + url)
    } catch (error) {
        console.error(error);
    }
};

init();