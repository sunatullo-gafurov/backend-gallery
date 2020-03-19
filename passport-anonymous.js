const passport = require('passport-strategy');
const util = require('util');

function Strategy() {
  passport.Strategy.call(this);
  this.name = 'anonymous';
}

// Object - immutability
Strategy.anonymous = Object.freeze({
  id: -1,
  fname: 'Anonymous',
  lname: 'Anonymous Last Name',
  login: null,
  password: null,
});

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function (req) {
  if (!req.headers.authorization) {
    this.success(Strategy.anonymous);
  }
};

exports.Strategy = Strategy