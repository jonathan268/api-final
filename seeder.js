require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const User = require('./src/models/User');
const Role = require('./src/models/Role');

// ───────────────────────────────────────────
//   Modifiez ces valeurs avant l'exécution
// ───────────────────────────────────────────
const ADMIN_NAME     = 'Admin';
const ADMIN_EMAIL    = 'admin@cshop.com';
const ADMIN_PASSWORD = 'Admin@1234'; // Changez ce mot de passe !
// ───────────────────────────────────────────

async function seed() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('  MONGO_URI introuvable dans le fichier .env');
    process.exit(1);
  }

  console.log('  Connexion à MongoDB...');
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('  Connecté à MongoDB.');

  // 1. Créer le rôle "admin" s'il n'existe pas encore
  let adminRole = await Role.findOne({ name: 'admin' });
  if (!adminRole) {
    adminRole = await Role.create({ _id: uuidv4(), name: 'admin' });
    console.log(' Rôle "admin" créé :', adminRole._id);
  } else {
    console.log('   Rôle "admin" déjà existant :', adminRole._id);
  }

  // 2. Vérifier si un utilisateur avec cet email existe déjà
  let user = await User.findOne({ email: ADMIN_EMAIL });

  if (user) {
    console.log('   Utilisateur existant :', ADMIN_EMAIL);
    const hasAdminRole = user.roles.some(
      (r) => r.toString() === adminRole._id.toString()
    );
    if (!hasAdminRole) {
      user.roles.push(adminRole._id);
      await user.save();
      console.log('  Rôle admin assigné avec succès.');
    } else {
      console.log('   Cet utilisateur possède déjà le rôle admin. Rien à faire.');
    }
  } else {
    // 3. Créer le nouvel utilisateur admin
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    user = await User.create({
      _id:      uuidv4(),
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashedPassword,
      roles:    [adminRole._id],
    });

    console.log('');
    console.log('  Utilisateur admin créé avec succès !');
    console.log('    Email    :', user.email);
    console.log('    Password :', ADMIN_PASSWORD, '  ← à changer en production !');
    console.log('    ID       :', user._id);
    console.log('');
  }

  await mongoose.connection.close();
  console.log('  Connexion MongoDB fermée.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('  Erreur lors du seeding :', err.message);
  mongoose.connection.close().finally(() => process.exit(1));
});
