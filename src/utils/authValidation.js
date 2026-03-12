const Joi = require("joi");
const { AppError } = require("./appError");

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
 * Schéma Register
 */
const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Le prénom est requis",
    "string.min": "Le prénom doit contenir au moins 2 caractères",
    "string.max": "Le prénom ne peut pas dépasser 50 caractères",
  }),

  lastName: Joi.string().min(2).max(50).required().messages({
    "string.empty": "Le nom est requis",
    "string.min": "Le nom doit contenir au moins 2 caractères",
    "string.max": "Le nom ne peut pas dépasser 50 caractères",
  }),

  email: Joi.string().email().required().messages({
    "string.empty": "L'email est requis",
    "string.email": "Email invalide",
  }),

  password: Joi.string().min(8).required().messages({
    "string.empty": "Le mot de passe est requis",
    "string.min": "Le mot de passe doit contenir au moins 8 caractères",
  }),

  phone: Joi.string()
    .pattern(/^(\+237)?6[0-9]{8}$/)
    .allow("", null)
    .messages({
      "string.pattern.base":
        "Numéro de téléphone invalide (format Cameroun: +237 6XX XX XX XX)",
    }),

  organizationName: Joi.string().min(2).max(100).allow("", null),
});

const validateRegister = validate(registerSchema);

/**
 * Schéma Login
 */
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "L'email est requis",
    "string.email": "Email invalide",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Le mot de passe est requis",
  }),
});

const validateLogin = validate(loginSchema);

/**
 * Schéma Forgot Password
 */
const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.empty": "L'email est requis",
    "string.email": "Email invalide",
  }),
});

const validateForgotPassword = validate(forgotPasswordSchema);

/**
 * Schéma Reset Password
 */
const resetPasswordSchema = Joi.object({
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.empty": "Le mot de passe est requis",
      "string.min": "Le mot de passe doit contenir au moins 8 caractères",
      "string.pattern.base":
        "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre",
    }),

  passwordConfirm: Joi.string().valid(Joi.ref("password")).required().messages({
    "any.only": "Les mots de passe ne correspondent pas",
    "string.empty": "La confirmation du mot de passe est requise",
  }),
});

const validateResetPassword = validate(resetPasswordSchema);

/**
 * Schéma Change Password
 */
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.empty": "Le mot de passe actuel est requis",
  }),

  newPassword: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      "string.empty": "Le nouveau mot de passe est requis",
      "string.min": "Le mot de passe doit contenir au moins 8 caractères",
      "string.pattern.base":
        "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre",
    }),

  newPasswordConfirm: Joi.string()
    .valid(Joi.ref("newPassword"))
    .required()
    .messages({
      "any.only": "Les mots de passe ne correspondent pas",
      "string.empty": "La confirmation du nouveau mot de passe est requise",
    }),
});

const validateChangePassword = validate(changePasswordSchema);

/**
 * Schéma Update Profile
 */
const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50),
  lastName: Joi.string().min(2).max(50),
  phone: Joi.string()
    .pattern(/^(\+237)?6[0-9]{8}$/)
    .allow("", null),
  avatar: Joi.string().uri().allow("", null),

  preferences: Joi.object({
    language: Joi.string().valid("fr", "en"),
    timezone: Joi.string(),
    theme: Joi.string().valid("light", "dark", "auto"),
    notifications: Joi.object({
      email: Joi.boolean(),
      push: Joi.boolean(),
      lowStock: Joi.boolean(),
      aiInsights: Joi.boolean(),
      weeklyReport: Joi.boolean(),
    }),
  }),
});

const validateUpdateProfile = validate(updateProfileSchema);

/**
 * Schéma Change Email
 */
const changeEmailSchema = Joi.object({
  newEmail: Joi.string().email().required().messages({
    "string.empty": "Le nouvel email est requis",
    "string.email": "Email invalide",
  }),

  password: Joi.string().required().messages({
    "string.empty": "Le mot de passe est requis",
  }),
});

const validateChangeEmail = validate(changeEmailSchema);

module.exports = {
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateChangePassword,
  validateUpdateProfile,
  validateChangeEmail,
};
