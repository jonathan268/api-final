const mongoose = require('mongoose');

const connectDB = async () => {

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
 
  if (!mongoUri) {
    console.error(' ERREUR CRITIQUE : Aucune URI MongoDB trouvée.');
    console.error('Veuillez définir la variable d\'environnement MONGO_URI ou MONGODB_URI');
    console.error('Exemple : mongodb+srv://utilisateur:motdepasse@cluster.mongodb.net/maBase');
    process.exit(1); 
  }

 
  const maskedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//****:****@');
  console.log(` Tentative de connexion à MongoDB : ${maskedUri}`);

  try {
    const options = {
      autoIndex: true, 
      maxPoolSize: 10, 
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,  
      family: 4, 
    };

    // Établir la connexion
    await mongoose.connect(mongoUri, options);

    console.log(' Connexion à MongoDB établie avec succès !');
    
    
    mongoose.connection.on('disconnected', () => {
      console.warn(' MongoDB déconnecté !');
    });

    mongoose.connection.on('error', (err) => {
      console.error(' Erreur MongoDB après connexion :', err);
    });

    // Gestion de l'arrêt de l'application
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(' Connexion MongoDB fermée suite à l\'arrêt de l\'application');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await mongoose.connection.close();
      console.log(' Connexion MongoDB fermée suite à l\'arrêt de l\'application');
      process.exit(0);
    });

  } catch (error) {
    console.error(' Échec de la connexion à MongoDB :', error.message);
    process.exit(1); 
  }
};

module.exports = connectDB;