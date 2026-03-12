const Role = require('../models/Role');

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const existing = await Role.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Ce rôle existe déjà' });

    const role = new Role({ name, permissions });
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Rôle non trouvé' });
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ error: 'Rôle non trouvé' });

    if (name) role.name = name;
    if (permissions) role.permissions = permissions;

    await role.save();
    res.json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    // Vérifier si des utilisateurs ont ce rôle (pour éviter orphelins)
    const User = require('../models/User');
    const usersWithRole = await User.findOne({ roles: req.params.id });
    if (usersWithRole) {
      return res.status(400).json({ error: 'Impossible de supprimer un rôle attribué à des utilisateurs' });
    }
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ error: 'Rôle non trouvé' });
    res.json({ message: 'Rôle supprimé' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};