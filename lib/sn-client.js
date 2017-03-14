/*
 * The util that controls sending the actual server communications
 */
var winston = require('winston');
var agentkeepalive = require('agentkeepalive'),
    HttpsAgent = agentkeepalive.HttpsAgent,
    agent = new HttpsAgent({ keepAlive: true, keepAliveTimeout: 300000 }),
    request = require('request'),
    cookieJar = request.jar(),
    request = request.defaults({ jar: cookieJar, followAllRedirects: true, agent: agent });

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

function login(onSuccess, onFail) {
    logit.info('Logging in to ' + snClient.baseUrl + ' as ' + snClient.user + '... ');
    var formParms = {
        user_name: snClient.user,
        user_password: snClient.pass,
        sys_action: 'sysverb_login',
        sysparm_login_url: 'welcome.do'
    };
    request.post(
        snClient.baseUrl + 'login.do', { form: formParms },
        function(error, response, body) {
            body = body || '';
            var m;
            if (/User name or password invalid/.test(body)) {
                onFail('User name or password invalid.');
            } else if (!(m = body.match(/userObject.setElevatedRoles\('(.*)'\);/))) {
                onFail('Unrecognized page returned after login.\n"' + body + '"');
            } else if (m[1].split(',').indexOf('security_admin') === -1) {
                onFail('Insufficient privileges. Must have security_admin to run code.');
            } else {
                onSuccess();
            }
        }
    );
}

var snClient = {
    baseUrl: '',
    user: '',
    pass: '',
    setInstance: function(host, auth, protocol) {
        //set baseUrl
        var protocol = protocol ? protocol : 'https'; // allow testing on localhost/http but default to https
        this.baseUrl = protocol + '://' + ((host.substr(-1) != '/') ? host + '/' : host);
        //set Credentials
        auth = new Buffer(auth, 'base64').toString();
        var authParts = auth.split(':');
        this.user = authParts[0];
        this.pass = authParts[1];
    },
    setLogger: function(logger) { logit = logger; },
    login: login
};

module.exports = snClient;