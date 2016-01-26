function ensureAuth(req, res, next){
  // console.log(req);
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

module.exports = ensureAuth;
