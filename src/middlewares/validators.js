const Joi = require("joi");

exports.registerSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(50)
    .required(),

  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),

  password: Joi.string().required(),
});

exports.loginSchema = Joi.object({
  email: Joi.string()
    .min(6)
    .max(60)
    .required()
    .email({
      tlds: { allow: ["com", "net"] },
    }),

  password: Joi.string().required(),
});

exports.addProductSchema = Joi.object({
  name: Joi.string().min(3).max(600).required(),

  description: Joi.string().min(6).max(600).required(),

  price: Joi.number().min(1).max(10000000).required(),
});
