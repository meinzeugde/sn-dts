#!/usr/bin/env node

// ---------------------------------------------------
// 3rd party modules

var argv = require('minimist')(process.argv.slice(2));
//console.dir(argv);

require('colors');
var fs = require('fs-extra');
var path = require('path');
// used to generate a hash of a file
var winston = require('winston');
var moment = require('moment');
var request = require('request');
var xml2js = require('xml2js');

// ---------------------------------------------------
// custom imports
var configLoader = require('../lib/config'),
    config = {},
    upgradeNeeded = require('../lib/upgrade'),
    notify = require('../lib/notify');

// our wrapper for winston used for logging
var logit = {};

// custom vars
var notifyObj = notify();
var notifyUserMsg = notifyObj.msg,
    notifyEnabled = true,
    // list of supported notification messages defined in notify.js
    msgCodes = notifyObj.codes;

var constants = {
    DOWNLOAD_OK: 1,
    DOWNLOAD_FAIL: -1,
    SLASH: '/'
        //isMac: /^darwin/.test(process.platform)
        //isWin = /^win/.test(process.platform)
};

// ---------------------------------------------------

// entry point
function init() {

    if (argv.help) {
        displayHelp();
        exitApp();
        return;
    }

    // get config
    try {
        if (!argv.config) {
            console.log('The config argument must be specified (eg. --config app.config.json)'.red);
            console.log('Run with --help for more info');
            exitApp();
        }
        configLoader.setConfigLocation(argv.config);
        config = configLoader.getConfig();
    } catch (e) {
        winston.error('Configuration error:'.red, e.message + ' (Stack: ' + e.stack + ')');
        exitApp();
    }

    setupLogging();

    enrichConfig();

    if (config.debug) {
        notifyObj.setDebug();
    }

    function start(upgradeBlocks) {
        if (upgradeBlocks) {
            logit.error('Upgrade is needed. Please check the Readme and change logs online.'.red);
            exitApp();
        }

        initComplete();
    }

    function initComplete() {
        logit.log('initComplete.. download table definitions..');
        downloadTableDefinitions();
    }

    upgradeNeeded(config, start);
}

/**
 * Exit node app
 * @param code - optional node system code. Defaults to 1 for normal exit. Any other number means error.
 */
function exitApp(code) {
    code = typeof code == 'undefined' ? 1 : code;
    process.exit(code);
}

/**
 * Add to the config var additional config/options.
 * Config is shared with all modules so things like constants and loggers
 * may be needed in other modules.
 */
function enrichConfig() {
    // support for 3rd party logging (notify)
    config._logger = logit;
}

function displayHelp() {
    var msgs = ['--help                   :: shows this message',
        '--config <file>          :: specify a path to your app.config.json file',
        '--download               :: will download all given table definitions from the config'

    ];
    console.log('Help'.green);
    console.log('List of options:');
    for (var i in msgs) {
        console.log(' ' + msgs[i]);
    }
}

function handleError(err, context) {
    logit.error(err);
    if (context) {
        logit.error('  handleError context:', context);
    }
}

/*
 * @debug Bool : true to set log level to (include) debug
 */
function setupLogging() {
    var logger = new(winston.Logger)({
        transports: [
            new(winston.transports.Console)({
                timestamp: function() {
                    return moment().format("HH:mm:ss");
                    //return moment().format("YY-MM-DD HH:mm:ss");
                    //return Date.now();
                },
                colorize: true,
                prettyPrint: true
            })
        ]
    });

    // support easier debugging of tests
    logit.test = function() {
        console.log('...............');
        if (typeof arguments[0] == 'string') {
            this.info(arguments[0].underline);
        } else {
            this.info(arguments[0]);
        }
        for (var i = 1; i < arguments.length; i++) {
            this.info(' - ', arguments[i]);
        }
    };

    logger.extend(logit);

    if (config.debug) {
        logger.level = 'debug';
    }

}

function getBaseUrl(basePath, host, protocol) {
    var protocol = protocol ? protocol : 'https'; // allow testing on localhost/http but default to https
    return protocol + '://' + ((host.substr(-1) != '/') ? host + '/' : host);
}

function downloadTableDefinitions() {
    for (var r in config.roots) {
        var basePath = r,
            root = config.roots[r],
            baseUrl = getBaseUrl(basePath, root.host, 'https'),
            instanceRequest = request.defaults({
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Basic ' + root.auth
                }
            });

        for (var i = 0; i < config.tables.length; i++) {
            requestData(instanceRequest, root.host, basePath, baseUrl, config.tables[i]);
        }
    }
}

function requestData(instanceRequest, host, basePath, baseUrl, tableName) {
    instanceRequest(baseUrl + tableName + '.do?SCHEMA', function(error, response, body) {
        if (!error && response.statusCode == 200) {
            //convert body from XML to JSON and parse data
            var parseString = xml2js.parseString;
            parseString(body, function(err, result) {
                if (!err && !result.error) {
                    //parse JSON data
                    var dtsContent = convertSchemaToDts(tableName, result);
                    if (dtsContent) {
                        //write to file
                        var filename = path.resolve(basePath + '/typings/servicenow-dts/GlideRecord/' + tableName + '.d.ts');
                        fs.outputFile(filename, dtsContent, function(err) {
                            if (err) {
                                logit.error('Error updating/writing d.ts file. path: ' + filename);
                            } else {
                                logit.info('Successfully created/updated d.ts file. path: ' + filename);
                            }
                        });
                    }
                } else {
                    logit.error('[' + host + '|' + tableName + '] Conversion failed - ' + (err || result.error));
                }
            });
        } else {
            logit.error('[' + host + '|' + tableName + '] Connection failed - ' + (error || body) + ' (' + response.statusCode + ')');
        }
    });
}

function convertSchemaToDts(tableName, schema) {
    try {
        var contentArr = [];
        var interfaceName = 'I' + snakeToCamel(tableName, true);
        var elements = schema[tableName].element;

        //Generate Header
        contentArr = contentArr.concat(
            'declare module sn {',
            '   export module Server {',
            '       export interface IGlideServerRecord {',
            '           new (type: \'' + tableName + '\'): sn.Types.' + interfaceName + ';',
            '       }',
            '   }',
            '',
            '   export module Types {',
            '       export interface ' + interfaceName + ' extends sn.Server.IGlideServerRecord {'
        );

        //Sort Attributes by name
        elements.sort(function(a, b) {
            if (a['$'].name > b['$'].name) return 1;
            if (a['$'].name < b['$'].name) return -1;
            return 0;
        });

        //Generate Attribute Definitions
        for (c in elements) {
            var column = elements[c]['$'];
            // contentArr = contentArr.concat('           /* "' + 'TBD' + '" */');
            contentArr = contentArr.concat('           ' + column.name + ': ' + column.internal_type + '; // ' + column.internal_type + ' (' + column.max_length + ')' + getChoiceList(column) + getReference(column));
        }

        //Generate Footer
        contentArr = contentArr.concat(
            '       }',
            '   }',
            '}'
        );

        return contentArr.join("\n");
    } catch (err) {
        logit.error('[' + tableName + '] Converting Schema to d.ts failed - ' + err);
        return false;
    }
}

function snakeToCamel(string, capitalized) {
    var retVal = string.replace(/(\_\w)/g, function(m) { return m[1].toUpperCase(); });
    if (capitalized) retVal = retVal.charAt(0).toUpperCase() + retVal.slice(1);
    return retVal;
};

function getReference(column) {
    if (column.internal_type != 'reference') return '';
    return ' >>> ' + column.reference_table;
};

function getChoiceList(column) {
    if (column.choice_list != 'true') return '';
    return ' [Choice List]';
};

init();