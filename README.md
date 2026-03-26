# 🛒 E-Commerce API

API REST complète pour une application e-commerce, construite avec **Node.js**, **Express** et **MongoDB**. Elle gère l'authentification JWT, les rôles, les produits, les commandes et les paiements via **CinetPay** (Mobile Money).

---

## 🚀 Stack technique

| Technologie | Usage |
|---|---|
| Node.js + Express 5 | Serveur & routing |
| MongoDB + Mongoose | Base de données |
| JWT + bcrypt | Authentification & hachage |
| Passport.js | OAuth social (Google, GitHub, Facebook) |
| CinetPay SDK | Paiement Mobile Money |
| Multer | Upload d'images |
| Swagger UI | Documentation interactive |
| Joi | Validation des données |
| express-rate-limit | Protection anti brute-force |

---

## 📁 Structure du projet

```
api-final/
├── index.js                  # Point d'entrée
├── seeder.js                 # Seed de la base de données
├── uploads/                  # Images uploadées
└── src/
    ├── config/
    │   ├── db.js             # Connexion MongoDB
    │   ├── passport.js       # Stratégies OAuth
    │   └── swagger.js        # Config Swagger
    ├── controllers/          # Logique métier
    ├── middlewares/          # Auth, autorisation, upload, validation
    ├── models/               # Schémas Mongoose
    ├── routes/               # Définition des endpoints
    └── utils/                # Helpers (hashing, erreurs, validations)
```

---

## ⚙️ Installation

### Prérequis

- Node.js >= 18
- MongoDB Atlas (ou instance locale)
- Compte CinetPay (pour les paiements)

### Cloner et installer

```bash
git clone https://github.com/jonathan268/api-final.git
cd api-final
npm install
```

### Variables d'environnement

Créer un fichier `.env` à la racine :

```env
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/<dbname>

# JWT
JWT_SECRET=your_jwt_secret
JWT_EXPIRES=7d

# Frontend
FRONTEND_URL=http://localhost:5173

# CinetPay
CINETPAY_API_KEY=your_cinetpay_api_key
CINETPAY_SITE_ID=your_site_id

# OAuth Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/oauth/google/callback
```

### Lancer le serveur

```bash
# Développement
npm run dev

# Production
npm start
```

### Seeder (données initiales)

```bash
node seeder.js
```

---

## 📖 Documentation API

Une fois le serveur lancé, la documentation Swagger interactive est disponible à :

```
http://localhost:3000/api-docs
```

---

## 🔌 Endpoints

### 🔐 Authentification — `/api/auth`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Créer un compte | ❌ |
| `POST` | `/api/auth/login` | Se connecter (JWT) | ❌ |
| `POST` | `/api/auth/logout` | Se déconnecter | ❌ |

> ⚠️ Rate limiting : 20 requêtes max par 15 minutes sur ces routes.

---

### 🌐 OAuth Social — `/api/oauth`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/oauth` | Voir mes providers liés | ✅ |
| `POST` | `/api/oauth/link` | Lier un provider | ✅ |
| `DELETE` | `/api/oauth/:provider` | Délier un provider | ✅ |
| `GET` | `/api/oauth/google` | Connexion via Google | ❌ |
| `GET` | `/api/oauth/google/callback` | Callback Google OAuth | ❌ |

---

### 📦 Produits — `/api/products`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/products` | Liste tous les produits | ❌ |
| `GET` | `/api/products/:id` | Détail d'un produit | ❌ |
| `POST` | `/api/products/add-product` | Ajouter un produit (+ image) | ✅ Admin |
| `PUT` | `/api/products/update-product` | Modifier un produit | ✅ Admin |
| `DELETE` | `/api/products/delete-product` | Supprimer un produit | ✅ Admin |

---

### 🧾 Commandes — `/api/orders`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/orders` | Liste mes commandes | ✅ |
| `POST` | `/api/orders` | Créer une commande | ✅ |
| `GET` | `/api/orders/:id` | Détail d'une commande | ✅ |
| `PUT` | `/api/orders/:id/cancel` | Annuler une commande | ✅ |
| `PUT` | `/api/orders/:id/status` | Changer le statut | ✅ Admin |

Statuts possibles : `pending` → `paid` → `shipped` → `delivered` / `cancelled`

---

### 💳 Paiements — `/api/payments`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/payments/cinetpay/initiate` | Initier un paiement CinetPay | ✅ |
| `GET` | `/api/payments/cinetpay/status/:transactionId` | Vérifier le statut | ✅ |
| `POST` | `/api/payments/cinetpay-webhook` | Webhook IPN CinetPay | ❌ Public |
| `GET` | `/api/payments/return` | Retour après paiement | ❌ Public |

---

### 💰 Transactions — `/api/transactions`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/transactions` | Liste toutes les transactions | ✅ Admin |
| `GET` | `/api/transactions/:id` | Détail d'une transaction | ✅ Admin |
| `POST` | `/api/transactions` | Créer une transaction | ✅ Admin |

---

### 👤 Utilisateurs — `/api/users`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/users` | Liste tous les users | ✅ Admin |
| `GET` | `/api/users/:id` | Profil d'un utilisateur | ✅ |
| `PUT` | `/api/users/:id` | Modifier un utilisateur | ✅ |
| `DELETE` | `/api/users/:id` | Supprimer un utilisateur | ✅ Admin |
| `POST` | `/api/users/:id/roles` | Gérer les rôles d'un user | ✅ Admin |

---

### 🛡️ Rôles — `/api/roles`

| Méthode | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/api/roles` | Liste les rôles | ✅ Admin |
| `POST` | `/api/roles` | Créer un rôle | ✅ Admin |
| `GET` | `/api/roles/:id` | Détail d'un rôle | ✅ Admin |
| `PUT` | `/api/roles/:id` | Modifier un rôle | ✅ Admin |
| `DELETE` | `/api/roles/:id` | Supprimer un rôle | ✅ Admin |

---

## 🗄️ Modèles de données

| Modèle | Champs clés |
|---|---|
| `User` | `email`, `name`, `password` (hashé), `roles[]` |
| `Role` | `name` (unique) |
| `Product` | `name`, `description`, `price`, `image` |
| `Order` | `userId`, `status`, `totalAmount`, `items[]` |
| `OrderItem` | `orderId`, `productId`, `quantity`, `price` |
| `Payment` | `userId`, `status` (PENDING/SUCCESS/FAILED), `transactionId`, `paymentMethod` |
| `Transaction` | `paymentId`, `transactionId`, `type`, `amount`, `status` |
| `OAuthProvider` | `userId`, `provider`, `providerUserId`, `accessToken` |

> Tous les IDs utilisent **UUID v4** (pas ObjectId MongoDB).

---

## 🔒 Sécurité

- Authentification par **JWT Bearer Token**
- Hachage des mots de passe avec **bcrypt**
- Validation des entrées avec **Joi**
- Rate limiting sur les routes d'authentification
- RBAC (Role-Based Access Control) via middleware `authorize`
- CORS restreint selon l'environnement

---

## 🌍 Déploiement

| Service | Usage |
|---|---|
| **Render** | Hébergement du serveur Node.js |
| **MongoDB Atlas** | Base de données cloud |
| **Vercel** | Frontend React (`https://c-shop-w.vercel.app`) |

---

## 📄 Licence

ISC © [jonathan268](https://github.com/jonathan268)
