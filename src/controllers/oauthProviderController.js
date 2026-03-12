const OAuthProvider = require('../models/OAuthProvider');

// GET /oauth-providers – pour l'utilisateur connecté
exports.getMyProviders = async (req, res) => {
  try {
    const providers = await OAuthProvider.find({ userId: req.user._id });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /oauth-providers/link – (appelé après authentification OAuth)
exports.linkProvider = async (req, res) => {
  try {
    const { provider, providerUserId, accessToken, refreshToken, expiresAt } = req.body;
    // Vérifier si déjà lié
    const existing = await OAuthProvider.findOne({ userId: req.user._id, provider });
    if (existing) {
      // Mettre à jour les tokens
      existing.providerUserId = providerUserId;
      existing.accessToken = accessToken;
      existing.refreshToken = refreshToken;
      existing.expiresAt = expiresAt;
      await existing.save();
      return res.json(existing);
    }

    const oauth = new OAuthProvider({
      userId: req.user._id,
      provider,
      providerUserId,
      accessToken,
      refreshToken,
      expiresAt
    });
    await oauth.save();
    res.status(201).json(oauth);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /oauth-providers/:provider – dissocier
exports.unlinkProvider = async (req, res) => {
  try {
    const { provider } = req.params;
    const result = await OAuthProvider.findOneAndDelete({ userId: req.user._id, provider });
    if (!result) return res.status(404).json({ error: 'Fournisseur non lié' });
    res.json({ message: 'Fournisseur dissocié' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};