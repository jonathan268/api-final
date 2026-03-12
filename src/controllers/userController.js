const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcrypt');

// GET /users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('roles');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /users/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('roles');
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Vérifier que l'utilisateur connecté est admin ou le propriétaire du compte
    if (req.user._id.toString() !== user._id.toString() && !req.user.roles?.some(r => r.name === 'admin')) {
      return res.status(403).json({ error: 'Accès interdit' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PUT /users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    // Vérification des droits
    if (req.user._id.toString() !== user._id.toString() && !req.user.roles?.some(r => r.name === 'admin')) {
      return res.status(403).json({ error: 'Accès interdit' });
    }

    // Mise à jour des champs autorisés
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) {
      user.password = await bcrypt.hash(password, 10);
    }

    await user.save();
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /users/:id (admin only)
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /users/:id/roles (admin only) – ajouter ou retirer des rôles
exports.manageRoles = async (req, res) => {
  try {
    const { addRoles, removeRoles } = req.body; // tableaux d'IDs de rôles
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    if (addRoles && addRoles.length) {
      // Vérifier que les rôles existent
      const rolesExist = await Role.find({ _id: { $in: addRoles } });
      if (rolesExist.length !== addRoles.length) {
        return res.status(400).json({ error: 'Certains rôles ajoutés sont invalides' });
      }
      user.roles = [...new Set([...user.roles.map(r => r.toString()), ...addRoles])];
    }

    if (removeRoles && removeRoles.length) {
      user.roles = user.roles.filter(r => !removeRoles.includes(r.toString()));
    }

    await user.save();
    await user.populate('roles');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};