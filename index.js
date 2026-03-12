require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");
const cors = require("cors");
const path = require("path");
const rateLimit = require("express-rate-limit");
const passport = require('./src/config/passport');
const authRoutes = require('./src/routes/authRoutes');
const productRoutes = require('./src/routes/productRoutes')
const userRoutes = require('./src/routes/userRoutes')
const roleRoutes = require('./src/routes/rolesRoutes')
const orderRoutes = require('./src/routes/orderRoutes')
const paymentRoutes = require('./src/routes/paymentRoutes')
const transactionRoutes = require('./src/routes/transactionRoutes')
const oauthRoutes = require('./src/routes/oauthRoutes')
const { swaggerUi, specs } = require('./src/config/swagger');
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(passport.initialize());

// Configuration CORS
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://c-shop-w.vercel.app"
        : ["http://localhost:5173"],
    credentials: true,
  }),
);

// Rate limiting sur les routes d'authentification (anti brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: "Trop de tentatives, réessayez dans 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

connectDB();




// Routes de test
app.get("/", (req, res) => {
  res.json({ message: "ecommerce-api fonctionnelle !" });
});

// Endpoints pour le frontend

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes)
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/oauth', oauthRoutes);

// documentation de l'api

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, { explorer: true }));

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Erreur interne du serveur" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});

