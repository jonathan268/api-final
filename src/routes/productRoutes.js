const express = require("express");
const productController = require("../controllers/productController");
const authorize = require('../middlewares/authorize');
const auth = require('../middlewares/auth')
const upload = require('../middlewares/upload');
const router = express.Router();

router.get("/", productController.getAllProducts);
router.get("/:id", productController.getProductById);
router.post("/add-product", auth, authorize('admin'), upload.single('image'), productController.addProduct);
router.put("/update-product", auth, authorize('admin'), upload.single('image'), productController.updateProduct);
router.delete("/delete-product", auth, authorize('admin'), productController.deleteProduct);

module.exports = router;
