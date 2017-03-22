/*
 * The util that controls sending the actual server communications
 */
var winston = require('winston');
var fs = require('fs-extra');
var agentkeepalive = require('agentkeepalive'),
    HttpsAgent = agentkeepalive.HttpsAgent,
    agent = new HttpsAgent({ keepAlive: true, keepAliveTimeout: 300000 }),
    request = require('request');

var cookiesPath = '/.sn-dts/cookies/';

// our wrapper for winston used for logging
var logit = {
    debug: function() {
        console.log('please define your debugger (winston)');
    },
    info: function() {
        console.log('please define your debugger (winston)');
    },
    error: function() {
        console.log('please define your debugger (winston)');
    }
};

function _getCookies(onSuccess, onError) {
    logit.info('Try to load session cookies...');
    var filepath = snClient.basePath + cookiesPath;
    var filename = filepath + snClient.cookiesFileName;
    fs.readFile(filename, function(err, data) {
        if (err) {
            logit.info('No cookies found: ' + filename);
            onError();
        } else {
            logit.info('Found a cookie for avoiding ECONNREFUSED: ' + filename);
            onSuccess(data.toString());
        }
    });
}

function _saveCookies(cookieJar, onSuccess, onError) {
    logit.info('Store session cookies...');
    var filepath = snClient.basePath + cookiesPath;
    var filename = filepath + snClient.cookiesFileName;
    fs.outputFile(filename, cookieJar.getCookieString(snClient.baseUrl), function(err) {
        if (err) {
            logit.error('Error writing cookies file: ' + filename);
            onError();
        } else {
            logit.info('Saved cookie for avoiding ECONNREFUSED: ' + filename);
            onSuccess();
        }
    });
}

function _login(onSuccess, onFail) {
    logit.info('Logging in to ' + snClient.baseUrl + ' as ' + snClient.user + '... ');
    var formParms = {
        user_name: snClient.user,
        user_password: snClient.pass,
        sys_action: 'sysverb_login',
        sysparm_login_url: 'welcome.do'
    };

    //prepare cookie store
    request = require('request');
    var cookieJar = request.jar(),
        request = request.defaults({ jar: cookieJar, followAllRedirects: true, agent: agent });

    // process login procedure
    request.post(
        snClient.baseUrl + 'login.do', { form: formParms },
        function(error, response, body) {
            body = body || '';
            var m;
            if (error != null) {
                onFail(error);
            } else if (/User name or password invalid/.test(body)) {
                onFail('User name or password invalid.');
            } else if (!(m = body.match(/userObject.setElevatedRoles\('(.*)'\);/))) {
                onFail('Unrecognized page returned after login.\n"' + body + '"');
            } else if (m[1].split(',').indexOf('security_admin') === -1) {
                onFail('Insufficient privileges. Must have security_admin to run code.');
            } else {
                _saveCookies(cookieJar, function() {
                    snClient.cookieJar = cookieJar;
                    onSuccess();
                }, function() {
                    onSuccess(); //we may also continue if cookies are not stored
                });
            }
        }
    );
}

function establishConnection(onSuccess, onError) {
    _getCookies(function(cookiesData) {
        var cookieJar = request.jar();
        cookieJar.setCookie(cookiesData, snClient.baseUrl);
        snClient.cookieJar = cookieJar;
        onSuccess();
    }, function() {
        _login(onSuccess, onError);
    });
}

function getTableDefinitionAsJson(tableName, onSuccess, onFail) {
    request = request.defaults({ jar: snClient.cookiesJar, followAllRedirects: true, agent: agent });

    var url = snClient.baseUrl + 'sys_dictionary' + '.do';
    var params = {
        action: 'getRecords'
    };
    logit.info('Requesting ' + url + '...');
    request.post(url, params, function(error, response, body) {
        logit.info('ERROR: ' + error);
        logit.info('RESPONSE: ' + response.statusCode);

        var bodyJson;
        try {
            bodyJson = JSON.parse(body);
        } catch (error) {
            bodyJson = { error: error };
        }
        if (bodyJson.error != null) {
            bodyJson.error = error;
            onFail(bodyJson);
        } else if (error != null) {
            bodyJson.error = error;
            onFail(bodyJson);
        } else if (typeof bodyJson.records == 'undefined') {
            bodyJson.error = 'Table sys_dictionary is not defined.'
            onFail(bodyJson);
        } else if (bodyJson.records.length == 0) {
            bodyJson.error = 'Table ' + tableName + ' is not defined.'
            onFail(bodyJson);
        } else {
            onSuccess(bodyJson.records);
        }
    }).pipe(fs.createWriteStream(snClient.basePath + '/.sn-dts/request/' + tableName));
}

var snClient = {
    basePath: '',
    baseUrl: '',
    user: '',
    pass: '',
    cookiesFileName: '',
    cookiesJar: {},
    setInstance: function(basePath, host, auth, protocol) {
        //set baseUrl
        var protocol = protocol ? protocol : 'https'; // allow testing on localhost/http but default to https
        this.baseUrl = protocol + '://' + ((host.substr(-1) != '/') ? host + '/' : host);
        //set Credentials
        auth = new Buffer(auth, 'base64').toString();
        var authParts = auth.split(':');
        this.user = authParts[0];
        this.pass = authParts[1];
        // set cookies
        this.basePath = basePath;
        this.cookiesFileName = '.sn-dts.' + host + '.cookies';
    },
    setLogger: function(logger) { logit = logger; },
    establishConnection: establishConnection,
    getTableDefinitionAsJson: getTableDefinitionAsJson
};

module.exports = snClient;