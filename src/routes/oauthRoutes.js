const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const oauthController = require('../controllers/oauthProviderController');
const passport = require('passport');
const jwt = require('jsonwebtoken');

router.get('/', auth, oauthController.getMyProviders);
router.post('/link', auth, oauthController.linkProvider);
router.delete('/:provider', auth, oauthController.unlinkProvider);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// Callback après Google
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  (req, res) => {
    // Générer un token JWT
    const token = jwt.sign(
      { userId: req.user._id, roles: req.user.roles?.map(r => r.name) || [] },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );
    // Rediriger vers le frontend avec le token
    res.redirect(`${process.env.FRONTEND_URL}/login?token=${token}`); 
  }
);

module.exports = router;