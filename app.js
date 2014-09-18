var childProcess = require('child_process');
var os = require('os');

module.exports = {
  getNetStats: getNetStats,
  setNetParams: setNetParams
};

var isWin = /win/i.test(os.type());

/**
 * GET wrapper
 */
function getNetStats(name, cb) {
  'use strict';
  if (isWin) {
    winGetNetStats(name, cb);
  } else {
    linGetNetStats(name, cb);
  }
}

/**
 * SET wrapper
 */
function setNetParams(par, cb) {
  'use strict';
  if (isWin) {
    winSetNetParameters(par, cb);
  } else {
    linSetNetParameters(par, cb);
  }
}

/**
 * Runs netsh for a given interface name and parses its output
 * @param  {String} name Interface name
 * @param  {Function} cb callback executed with error and a result
 *  having format of { isStatic: Boolean, ip: String, maskLength: Number, gw: String }
 */
function winGetNetStats(name, cb) {
  'use strict';
  childProcess.exec('netsh interface ip show addresses "' + name + '"',
      function(err, stdout, stderr) {
        if (err) {
          return cb(new Error('Failed to run `netsh`'));
        }

        var res = {
          name: name
        };

        try {
          res.isStatic = stdout.match(/DHCP enabled:\s*(Yes|No)/)[1] === 'No';
          res.ip = stdout.match(/IP Address:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)[1];
          res.mask = formatNetMask(parseInt(stdout.match(/Subnet Prefix:\s*[\d\.]+\/(\d{1,2})/)[1], 10));
          res.gw = stdout.match(/Default Gateway:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)[1];
        } catch (e) {
          return cb(new Error('Unknown `netsh` output format'));
        }

        cb(null, res);
      }
  );
}

/**
 * Set net params in windows
 * @param  {[type]}   par { name: String, isStatic: Boolean, [ip: String],
 *  [mask: String], [gw: String]}
 * @param  {Function} cb callback takes only optional error occured
 */
function winSetNetParameters(par, cb) {
  'use strict';
  if (!par.name) {
    return process.nextTick(function() {
      cb(new Error('Name is not set'));
    });
  }

  if (!par.isStatic) {
    // setting dhcp mode, no need to have ip, mask and gw
    childProcess.exec(
        'netsh interface ip set address "' + par.name + '" dhcp',
        afterExec
    );
  } else {
    par.ip = validateIp(par.ip) ? par.ip : null;
    par.mask = validateIp(par.mask) ? par.mask : null;
    par.gw = validateIp(par.gw) ? par.gw : null;

    if (!(par.ip && par.mask && par.gw)) {
      return process.nextTick(function() {
        cb(new Error('Invalid parameters'));
      });
    }

    childProcess.exec(
        'netsh interface ip set address "' + par.name + '" static ' +
        [par.ip, par.mask, par.gw].join(' '),
        afterExec
    );
  }

  function afterExec(err, stdout, stderr) {
    if (/requires elevation/.test(stdout)) {
      return cb(new Error('Permission denied'));
    } else {
      // tolerate other errors
      cb(null);
    }
  }
}

/**
 * Runs nmcli for a given interface name and parses its output
 * @param {String} name Interface name
 * @param {Function} cb callback executed with error and a result
 *  having format of { isStatic: Boolean, ip: String, maskLength: Number, gw: String }
 */
function linGetNetStats(name, cb) {
  'use strict';

  childProcess.exec(
      ['nmcli', '-t', 'dev', 'list', 'iface', name].join(' '),
      function(err, stdout, stderr) {
        var res;

        try {
          var data = stdout.match(/IP4\.ADDRESS\[1\]:\s?(.+)\n/)[1];

          // e.g. matches 'ip = 192.168.82.4/24, gw = 192.168.82.1'
          var match = data.match(/ip\s?=\s?([\d.]+)\/(\d{1,2}),\s?gw\s?=\s?([\d.]+)/);
          res = {
            name: stdout.match(/GENERAL\.DEVICE:\s?(\w+)\n/)[1],
            ip: match && match[1] || null,
            mask: match && formatNetMask(match[2]) || null,
            gw: match && match[3] || null,
            isStatic: stdout.indexOf('DHCP') === -1
          };
        } catch (e) {
          return cb(new Error('Unknown `nmcli` output format'));
        }
        cb(null, res);
      }
  );
}

/**
 * Set net params in ubuntu
 * @param  {[type]}   par { name: String, isStatic: Boolean, [ip: String],
 *  [mask: String], [gw: String]}
 * @param  {Function} cb callback takes only optional error occured
 */
function linSetNetParameters(par, cb) {
  'use strict';
  cb(new Error('Not yet implemented'));
}

/**
 * Validates ip address
 * @param  {String} ip string
 * @return {Boolean}
 */
function validateIp(ip) {
  'use strict';
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}

/**
 * Formats netmask of a given length
 * @param  {Number} maskLength
 * @return {String} netmask
 */
function formatNetMask(maskLength) {
  'use strict';

  var bitStr = '';
  for (var i = 0; i < maskLength; i++) {
    bitStr += '1';
  }
  for (; i < 32; i++) {
    bitStr += '0';
  }

  return bitStr.match(/[10]{8}/g).map(function(chunk) {
    return parseInt(chunk, 2);
  }).join('.');
}
