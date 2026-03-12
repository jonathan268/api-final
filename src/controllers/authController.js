const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { doHash, doHashValidation } = require("../utils/hashing");
const { loginSchema } = require("../middlewares/validators");
const { registerSchema } = require("../middlewares/validators");

exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const { error, value } = registerSchema.validate({ name, email, password });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "L'utilisateur existe déjà" });
    }

    const hashedPassword = await doHash(password, 12);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    const result = await newUser.save();
    result.password = undefined;
    res.status(201).json({
      success: true,
      message: "Utilisateur créer avec succès",
      result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de l'inscription" });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const { error, value } = loginSchema.validate({ email, password });
    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const existingUser = await User.findOne({ email }).select("+password");
    if (!existingUser) {
      return res
        .status(401)
        .json({ success: false, message: "L'utilisateur n'existe pas" });
    }

    const result = await doHashValidation(password, existingUser.password);
    if (!result) {
      return res
        .status(401)
        .json({ success: false, message: "Identifiants Invalides !" });
    }

    const token = jwt.sign(
      {
        userId: existingUser._id,
        email: existingUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" },
    );

    res
      .cookie("Authorization", "Bearer " + token, {
        expires: new Date(Date.now() + 8 * 3600000),
        httpOnly: process.env.NODE_ENV === "production",
        secure: process.env.NODE_ENV === "production",
      })
      .json({
        success: true,
        token,
        message: "Connexion réussie",
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur lors de la connexion" });
  }
};

exports.logout = async (req, res) => {
  res
    .clearCookie("Authorization")
    .status(200)
    .json({ success: true, message: "Déconnecté avec succès" });
};
