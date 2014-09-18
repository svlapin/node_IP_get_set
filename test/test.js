var assert = require('assert');
var ipGetSet = require('../app.js');
var os = require('os');

describe('get net parameters', function() {
  var iface = 'wlan0';//Object.keys(os.networkInterfaces())[0];

  it('should end without error', function(done) {
    ipGetSet.getNetStats(iface, done);
  });

  it('should return name, ip, mask, gateway', function(done) {
    ipGetSet.getNetStats(iface, function(err, res) {
      var keys = Object.keys(res);
      assert(keys.indexOf('name') !== -1);
      assert(keys.indexOf('ip') !== -1);
      assert(keys.indexOf('mask') !== -1);
      assert(keys.indexOf('gw') !== -1);
      done();
    });
  });

  it('ip, gateway, mask should look like IP', function(done) {
    ipGetSet.getNetStats(iface, function(err, res) {
      assert(validateIp(res.ip));
      assert(validateIp(res.gw));
      assert(validateIp(res.mask));
      done();
    });
  });
});

describe('set net parameters', function() {
  var iface = 'some';

  it('should give a error when name is not set', function(done) {
    ipGetSet.setNetParams({}, function(err) {
      if (!(err && err.message === 'Name is not set')) {
        throw err;
      }
      done();
    });
  });

  it('should give a error when setting a static ip and params are missing', function(done) {
    ipGetSet.setNetParams({
      name: iface,
      isStatic: true
    }, function(err) {
      if (!(err && err.message === 'Invalid parameters')) {
        throw new Error('Error is absent');
      }
      done();
    });
  });

  it('should give a error when setting a static and ip is invalid', function(done) {
    ipGetSet.setNetParams({
      name: iface,
      isStatic: true,
      ip: '1123.123.123.1',
      gw: '192.168.0.1',
      mask: '255.255.255.0'
    }, function(err) {
      if (!(err && err.message === 'Invalid parameters')) {
        throw new Error('Error is absent');
      }
      done();
    });
  });
});

function validateIp(ip) {
  return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip);
}