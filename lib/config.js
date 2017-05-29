/*
 * Load settings and config used to identify project, connection and tables syncing information.
 */

var assert = require('assert-plus');
require('colors');
var fs = require('fs-extra');
var path = require('path');
var util = require('util');

// non documented function. Worry about that some other day. It won't go away soon because nodejs relies on it!
var extend = require('util')._extend;

// the location of the config file (populated dynamically)
var config_file = '';

// initial config for tables (can be overridden in app.config.json)
var CONFIG_TABLES = path.join('..', 'lib', 'tables.config.json');

function saveConfig(config) {
    fs.outputFile(config_file, JSON.stringify(config, null, 4), function(err) {
        if (err) console.log('Error updating/writing config file. path: ' + config_file);
        assert.ifError(err);
    });
}

function encodeCredentials(host) {
    assert.ok(host.user && host.pass, 'Invalid root config. user, pass or auth missing.');
    host.auth = new Buffer(host.user + ':' + host.pass).toString('base64');
    delete host.user;
    delete host.pass;
    return host;
}

function validateRootFolder(folder) {
    assert.ok(fs.existsSync(folder), util.format('root folder: "%s" was not found.', folder));
    assert.ok(fs.statSync(folder).isDirectory(), util.format('root folder: "%s" is not a directory.', folder));
}

function configValid(config) {
    if (!config) {
        console.error('Invalid configuration. Application exiting.'.red);
        process.exit(1);
        return false;
    }
    logConfig(config);
    return true;
}

function _getHomeDir() {
    // should also be windows friendly but not tested
    var ans = process.env[(process.platform.indexOf('win') >= 0) ? 'USERPROFILE' : 'HOME'];
    return ans;
}

function loadTables(config) {
    var confTablesArr = require(CONFIG_TABLES);
    if (!config.tables) {
        config.tables = confTablesArr;
    }
}

function getConfig() {
    var config = require(config_file);
    config.debug = config.debug || false;

    assert.object(config.roots, 'roots');

    var roots = Object.keys(config.roots);
    assert.ok(roots.length > 0, 'At least one root folder must be configured.');

    loadTables(config);
    assert.object(config.tables, 'tables');

    var save = false;
    roots.forEach(function(root) {
        validateRootFolder(root);
        var host = config.roots[root];
        assert.ok(host.host, 'Invalid root config. host missing.');
        if (!host.auth) {
            config.roots[root] = encodeCredentials(host);
            save = true;
        }
    });

    if (save) {
        saveConfig(config);
        console.log('Configuration: credentials encoded.'.green);
    }

    configValid(config);

    // make it easier to find the root property
    roots.forEach(function(root) {
        config.roots[root].root = root;
    });

    return config;
}

// pathToConfig must exist or the (advanced) user has made a mistake that they can fix
function setConfigLocation(pathToConfig) {
    // resolve ~/ or ../ style paths
    config_file = path.resolve(pathToConfig);

    console.log('Using config file: ' + config_file.green);
    return config_file;
}


// debug
function logConfig(config) {
    console.log('');
    console.log('Root folder sync to instance mapping:');
    Object.keys(config.roots).forEach(function(root) {
        console.log('-', root, '|', config.roots[root].host);
    });
    console.log('');
    console.log('Root subfolder to table mapping:');
    config.tables.forEach(function(table) {
        console.log(table);
    });
    console.log('');

    if (config.debug) {
        console.log(JSON.stringify(config));
    }
}


module.exports = {
    "getConfig": getConfig,
    "setConfigLocation": setConfigLocation
};