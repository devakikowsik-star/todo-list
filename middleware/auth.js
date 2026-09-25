'use strict';

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  req.flash('error', 'Please log in to continue.');
  return res.redirect('/login');
}

function ensureAdmin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    if (req.user && req.user.role === 'admin') {
      return next();
    }
    req.flash('error', 'Access denied. Administrator privileges required.');
    return res.status(403).render('errors/403', {
      title: '403 - Forbidden',
      user: req.user,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
    });
  }
  req.flash('error', 'Please log in as an administrator.');
  return res.redirect('/login');
}

module.exports = {
  ensureAuthenticated,
  ensureAdmin,
};
