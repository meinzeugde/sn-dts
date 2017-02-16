/*
 * Load settings and config used to identify project, connection and folder syncing information.
 */

var assert = require('assert-plus');
require('colors');
var fs = require('fs');
var path = require('path');

// the location of the config file (populated dynamically)
var config_file = '';

function saveConfig(config) {
    var content = JSON.stringify(config, null, 4);
    fs.writeFile(config_file, JSON.stringify(config, null, 4), function(err) {
        if (err) console.log('Error updating/writing config file. path: ' + config_file);
        assert.ifError(err);
    });
}

function encodeCredentials(config) {
    assert.ok(config.user && config.pass, 'Invalid root config. user, pass or auth missing.');
    config.auth = new Buffer(config.user + ':' + config.pass).toString('base64');
    delete config.user;
    delete config.pass;
    return config;
}

function _getHomeDir() {
    // should also be windows friendly but not tested
    var ans = process.env[(process.platform.indexOf('win') >= 0) ? 'USERPROFILE' : 'HOME'];
    return ans;
}

function getConfig() {
    var config = require(config_file);

    var save = false;
    if (!config.auth) {
        config = encodeCredentials(config);
        save = true;
    }
    if (save) {
        saveConfig(config);
        console.log('Configuration: credentials encoded.'.green);
    }

    return config;
}

// pathToConfig must exist or the (advanced) user has made a mistake that they can fix
function setConfigLocation(pathToConfig) {
    // resolve ~/ or ../ style paths
    config_file = path.resolve(pathToConfig);

    console.log('Using config file: ' + config_file.green);
    return config_file;
}


module.exports = {
    "getConfig": getConfig,
    "setConfigLocation": setConfigLocation
};