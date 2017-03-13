var path = require('path');
var fs = require('fs-extra');


function upgradeNeeded(config, callback) {
    var winConfigUpgrade = oldWindowsPath(config);
    var needsUpgrade = winConfigUpgrade;

    callback(needsUpgrade);
}

function oldWindowsPath(config) {
    for (var r in config.roots) {
        if (r.indexOf("\\") >= 0) {
            console.log('Please change your config file to use unix/mac/web style paths instead of old school windows paths');
            return true;
        }
    }
    return false;
}

module.exports = upgradeNeeded;