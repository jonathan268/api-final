// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const OAuthProvider = require('../models/OAuthProvider');
const Role = require('../models/Role');
const { v4: uuidv4 } = require('uuid');

// Sérialisation/désérialisation (optionnelle si vous utilisez JWT sans sessions)
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

/**
 * Fonction utilitaire pour créer ou récupérer un utilisateur à partir d'un profil OAuth.
 * @param {Object} profile - Profil retourné par le fournisseur OAuth.
 * @param {string} provider - Nom du fournisseur ('google', 'facebook', 'github').
 * @param {string} accessToken - Token d'accès.
 * @param {string} refreshToken - Token de rafraîchissement (optionnel).
 * @returns {Promise<Object>} Utilisateur MongoDB.
 */
const findOrCreateUser = async (profile, provider, accessToken, refreshToken) => {
  const providerUserId = profile.id;
  const email = profile.emails?.[0]?.value || `${providerUserId}@${provider}.local`; // fallback
  const displayName = profile.displayName || profile.username || 
                      `${profile.name?.givenName || ''} ${profile.name?.familyName || ''}`.trim() || providerUserId;

  //  Vérifier si ce provider est déjà lié à un utilisateur
  let oauthProvider = await OAuthProvider.findOne({ provider, providerUserId }).populate('userId');
  if (oauthProvider) {
    // Mise à jour des tokens
    oauthProvider.accessToken = accessToken;
    oauthProvider.refreshToken = refreshToken || oauthProvider.refreshToken;
    oauthProvider.updatedAt = Date.now();
    await oauthProvider.save();
    return oauthProvider.userId;
  }

  //  Chercher un utilisateur existant avec cet email
  let user = await User.findOne({ email }).populate('roles');
  if (!user) {
    // Créer un nouvel utilisateur
    const userRole = await Role.findOne({ name: 'user' }) || await new Role({ name: 'user', permissions: [] }).save();
    user = new User({
      _id: uuidv4(),
      name: displayName,
      email,
      passwordHash: '', // pas de mot de passe
      roles: [userRole._id]
    });
    await user.save();
  }

  //  Lier le provider à l'utilisateur
  oauthProvider = new OAuthProvider({
    userId: user._id,
    provider,
    providerUserId,
    accessToken,
    refreshToken,
    expiresAt: profile.expiresAt ? new Date(profile.expiresAt) : null
  });
  await oauthProvider.save();

  return user;
};

// Google
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/oauth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const user = await findOrCreateUser(profile, 'google', accessToken, refreshToken);
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
  console.log(' Stratégie Google OAuth chargée');
} else {
  console.log(' Google OAuth désactivé (variables manquantes)');
}

module.exports = passport;