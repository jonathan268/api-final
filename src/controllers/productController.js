const { addProductSchema } = require("../middlewares/validators");
const Product = require("../models/Product");

exports.getAllProducts = async (req, res) => {
  const { page } = req.query;
  const productsPerPage = 10;

  try {
    let pageNum = 0;
    if (page <= 1) {
      pageNum = 0;
    } else {
      pageNum = page - 1;
    }

    const result = await Product.find()
      .sort()
      .skip(pageNum * productsPerPage)
      .limit(productsPerPage);
    res.status(200).json({
      success: true,
      message: "Produits récupérés avec succès",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.addProduct = async (req, res) => {
  const { name, description, price } = req.body;
  try {
    const { error, value } = addProductSchema.validate({
      name,
      description,
      price,
    });

    if (error) {
      return res
        .status(401)
        .json({ success: false, message: error.details[0].message });
    }

    const image = req.file ? req.file.path.replace(/\\/g, '/') : null;

    const result = await Product.create({
      name,
      description,
      price,
      image,
    });
    res.status(201).json({
      success: true,
      message: "Produit créer avec succès",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await Product.findById(id);

    if (!result) {
      return res.status(404).json({ success: false, message: "Produit Introuvable" });
    }

    res.status(200).json({
      success: true,
      message: "Produit récupéré avec succès",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};

exports.updateProduct = async (req, res) => {
  const { _id } = req.query;
  const {name, description, price} = req.body;

  try {
    const existingProduct = await Product.findById({ _id });
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Produit Introuvable" });
    }

    existingProduct.name = name; 
    existingProduct.description = description;
    existingProduct.price = price;

    if (req.file) {
      existingProduct.image = req.file.path.replace(/\\/g, '/');
    }

    const result = await existingProduct.save();

    res.status(200).json({
      success: true,
      message: "Produit mis à jour avec succès",
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};


exports.deleteProduct = async (req, res) => {
  const { _id } = req.query;
  try {
    const existingProduct = await Product.findById({ _id });
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Produit Introuvable" });
    }

    await Product.deleteOne({ _id });
    res.status(200).json({
      success: true,
      message: "Produit supprimé avec succès",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
};
