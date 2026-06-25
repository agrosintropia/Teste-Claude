'use strict';
const crypto = require('crypto');

const PASSWORD = process.env.APP_PASSWORD;

function hash(str) {
  return crypto.createHash('sha256').update(str + 'agrosintropia').digest('hex');
}

/** Express middleware: if APP_PASSWORD not set, access is open. */
function requireAuth(req, res, next) {
  if (!PASSWORD) return next(); // auth disabled
  const token = req.cookies?.agro_session;
  if (token === hash(PASSWORD)) return next();
  // If it's an API call, return 401
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Não autorizado.' });
  res.redirect('/login');
}

function handleLogin(req, res) {
  const { password } = req.body;
  if (password === PASSWORD) {
    res.cookie('agro_session', hash(PASSWORD), {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: 'strict',
    });
    return res.redirect('/');
  }
  res.redirect('/login?erro=1');
}

module.exports = { requireAuth, handleLogin };
