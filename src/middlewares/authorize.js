const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    const userRoles = req.user.roles?.map(role => role.name) || [];
    const hasRole = allowedRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    next();
  };
};

module.exports = authorize;