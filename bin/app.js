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

// ---------------------------------------------------
// custom imports
var configLoader = require('../lib/config'),
    snClient = require('../lib/sn-client'),
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
        snClient.setLogger(logit); //hand over logit to snClient
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

function downloadTableDefinitions() {
    for (var r in config.roots) {
        var basePath = r,
            root = config.roots[r];
        snClient.setInstance(root.host, root.auth, 'https')

        snClient.login(function() {
            logit.info('*** DOWNLOAD TABLE DEFINITIONS. *** (TODO)');
        }, function(error) {
            logit.error('[ERROR]: Login failed - ' + error);
            // exitApp(0);
        });
    }
}

init();