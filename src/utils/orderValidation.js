const Joi = require("joi");
const { AppError } = require("./appError");
const { isValidObjectId } = require("./validators");

/**
 * Middleware validation générique
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = {};
      error.details.forEach((detail) => {
        errors[detail.path.join(".")] = detail.message;
      });

      return next(new AppError("Erreur de validation", 400, errors));
    }

    req.body = value;
    next();
  };
};

/**
 * Schéma Item
 */
const orderItemSchema = Joi.object({
  product: Joi.string()
    .required()
    .custom((value, helpers) => {
      if (!isValidObjectId(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "string.empty": "Produit requis",
      "any.invalid": "ID de produit invalide",
    }),

  quantity: Joi.number().integer().min(1).required().messages({
    "number.base": "La quantité doit être un nombre",
    "number.min": "La quantité doit être au moins 1",
    "any.required": "Quantité requise",
  }),

  unitPrice: Joi.number().min(0).allow(null),

  discount: Joi.number().min(0).max(100).default(0),

  taxRate: Joi.number().min(0).max(100).default(0),

  notes: Joi.string().max(200).allow("", null),
});

/**
 * Schéma Create Order
 */
const createOrderSchema = Joi.object({
  type: Joi.string().valid("purchase", "sale").required().messages({
    "string.empty": "Type de commande requis",
    "any.only": "Type invalide (purchase ou sale)",
  }),

  supplier: Joi.string()
    .when("type", {
      is: "purchase",
      then: Joi.required(),
      otherwise: Joi.forbidden(),
    })
    .custom((value, helpers) => {
      if (value && !isValidObjectId(value)) {
        return helpers.error("any.invalid");
      }
      return value;
    })
    .messages({
      "any.required": "Fournisseur requis pour commande d'achat",
      "any.invalid": "ID de fournisseur invalide",
    }),

  customer: Joi.object({
    name: Joi.string().required(),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().allow("", null),
    address: Joi.object({
      street: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      country: Joi.string().default("Cameroun"),
      postalCode: Joi.string().allow("", null),
    }),
    taxId: Joi.string().allow("", null),
  }).when("type", {
    is: "sale",
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  items: Joi.array().items(orderItemSchema).min(1).required().messages({
    "array.min": "La commande doit contenir au moins un article",
    "any.required": "Articles requis",
  }),

  paymentMethod: Joi.string()
    .valid("cash", "mobile_money", "bank_transfer", "check", "credit")
    .default("cash"),

  paymentDetails: Joi.object({
    dueDate: Joi.date().allow(null),
    transactionId: Joi.string().allow("", null),
  }),

  delivery: Joi.object({
    method: Joi.string().valid("pickup", "delivery", "shipping"),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      country: Joi.string(),
      postalCode: Joi.string().allow("", null),
    }),
    estimatedDate: Joi.date().allow(null),
    notes: Joi.string().max(500).allow("", null),
  }),

  notes: Joi.string().max(1000).allow("", null),

  internalNotes: Joi.string().max(1000).allow("", null),

  reference: Joi.string().max(100).allow("", null),

  expectedDeliveryDate: Joi.date().allow(null),

  totals: Joi.object({
    discountPercentage: Joi.number().min(0).max(100).default(0),
    shipping: Joi.number().min(0).default(0),
  }),
});

const validateCreateOrder = validate(createOrderSchema);

/**
 * Schéma Update Order
 */
const updateOrderSchema = Joi.object({
  supplier: Joi.string().custom((value, helpers) => {
    if (value && !isValidObjectId(value)) {
      return helpers.error("any.invalid");
    }
    return value;
  }),

  customer: Joi.object({
    name: Joi.string(),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().allow("", null),
    address: Joi.object({
      street: Joi.string().allow("", null),
      city: Joi.string().allow("", null),
      country: Joi.string(),
      postalCode: Joi.string().allow("", null),
    }),
    taxId: Joi.string().allow("", null),
  }),

  items: Joi.array().items(orderItemSchema).min(1),

  paymentMethod: Joi.string().valid(
    "cash",
    "mobile_money",
    "bank_transfer",
    "check",
    "credit",
  ),

  delivery: Joi.object({
    method: Joi.string().valid("pickup", "delivery", "shipping"),
    address: Joi.object({
      street: Joi.string(),
      city: Joi.string(),
      country: Joi.string(),
      postalCode: Joi.string().allow("", null),
    }),
    estimatedDate: Joi.date().allow(null),
    notes: Joi.string().max(500).allow("", null),
  }),

  notes: Joi.string().max(1000).allow("", null),
  internalNotes: Joi.string().max(1000).allow("", null),
  reference: Joi.string().max(100).allow("", null),
  expectedDeliveryDate: Joi.date().allow(null),

  totals: Joi.object({
    discountPercentage: Joi.number().min(0).max(100),
    shipping: Joi.number().min(0),
  }),
});

const validateUpdateOrder = validate(updateOrderSchema);

/**
 * Schéma Update Status
 */
const updateStatusSchema = Joi.object({
  status: Joi.string()
    .valid(
      "draft",
      "pending",
      "confirmed",
      "processing",
      "completed",
      "cancelled",
    )
    .required()
    .messages({
      "string.empty": "Statut requis",
      "any.only": "Statut invalide",
    }),

  notes: Joi.string().max(500).allow("", null),
});

const validateUpdateStatus = validate(updateStatusSchema);

/**
 * Schéma Payment
 */
const paymentSchema = Joi.object({
  amount: Joi.number().min(0.01).required().messages({
    "number.base": "Montant doit être un nombre",
    "number.min": "Montant doit être supérieur à 0",
    "any.required": "Montant requis",
  }),

  method: Joi.string()
    .valid("cash", "mobile_money", "bank_transfer", "check", "credit")
    .default("cash"),

  transactionId: Joi.string().max(100).allow("", null),
});

const validatePayment = validate(paymentSchema);

module.exports = {
  validateCreateOrder,
  validateUpdateOrder,
  validateUpdateStatus,
  validatePayment,
};
