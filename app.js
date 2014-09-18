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
  isWin ? winGetNetStats(name, cb) : linGetNetStats(name, cb);
}

/**
 * SET wrapper
 */
function setNetParams(par, cb) {
  isWin ? winSetNetParameters(par, cb) : linSetNetParameters(par, cb);
}

/**
 * Runs netsh for a given interface name and parses its output
 * @param  {String} Interface name
 * @param  {Function} callback executed with error and a result
 *  having format of { isStatic: Boolean, ip: String, maskLength: Number, gw: String }
 */
function winGetNetStats(name, cb) {
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
          res.maskLength = parseInt(stdout.match(/Subnet Prefix:\s*[\d\.]+\/(\d{1,2})/)[1], 10);
          res.gw = stdout.match(/Default Gateway:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/)[1];
        } catch (e) {
          return cb(new Error('Unknown `netsh` output format'));
        }

        cb(null, res);
  });
}

/**
 * Set net params in windows
 * @param  {[type]}   par { name: String, isStatic: Boolean, [ip: String],
 *  [mask: String], [gw: String]}
 * @param  {Function} callback takes only optional error occured
 */
function winSetNetParameters(par, cb) {
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
    console.log(par)
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
 * @param  {String} Interface name
 * @param  {Function} callback executed with error and a result
 *  having format of { isStatic: Boolean, ip: String, maskLength: Number, gw: String }
 */
function linGetNetStats(name, cb) {
  cb(new Error('Not yet implemented'));
}

/**
 * Set net params in ubuntu
 * @param  {[type]}   par { name: String, isStatic: Boolean, [ip: String],
 *  [mask: String], [gw: String]}
 * @param  {Function} callback takes only optional error occured
 */
function linSetNetParameters(par, cb) {
  cb(new Error('Not yet implemented'));
}

/**
 * Validates ip address
 * @param  {String} ip string
 * @return {Boolean}
 */
function validateIp(ip) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}