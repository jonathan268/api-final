// config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'E-commerce API',
      version: '1.0.0',
      description: 'API complète pour une plateforme e-commerce avec authentification JWT',
      contact: {
        name: 'Jonathan dev',
        email: 'darrenjonathan97@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3000/api',
        description: 'Serveur de développement'
      },
      {
        url: 'https://ecommerce-node-api-b5tp.onrender.com', 
        description: 'Serveur de production'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Entrez votre token JWT (sans le préfixe "Bearer ")'
        }
      },
      schemas: {
        User: {
          type: 'object',
          required: ['name', 'email', 'password'],
          properties: {
            _id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' },
            name: { type: 'string', example: 'Jean Dupont' },
            email: { type: 'string', format: 'email', example: 'jean@example.com' },
            roles: { 
              type: 'array', 
              items: { type: 'string' },
              example: ['user']
            },
            twoFactorEnabled: { type: 'boolean', default: false }
          }
        },
        Product: {
          type: 'object',
          required: ['name', 'price'],
          properties: {
            _id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440001' },
            name: { type: 'string', example: 'Smartphone XYZ' },
            description: { type: 'string', example: 'Le dernier modèle' },
            price: { type: 'number', example: 599.99 },
            stock: { type: 'integer', example: 50 }
          }
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            userId: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'integer' },
                  price: { type: 'number' }
                }
              }
            },
            totalAmount: { type: 'number' },
            status: { 
              type: 'string', 
              enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'] 
            },
            orderDate: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'jean@example.com' },
            password: { type: 'string', format: 'password', example: 'secret123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { 
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string' }
              }
            }
          }
        },
        TwoFactorRequest: {
          type: 'object',
          required: ['tempToken', 'token'],
          properties: {
            tempToken: { type: 'string' },
            token: { type: 'string', example: '123456' }
          }
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js',], 
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };