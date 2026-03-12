const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const userController = require('../controllers/userController');

router.use(auth); // toutes les routes nécessitent une authentification

router.get('/', authorize('admin'), userController.getAllUsers);
router.get('/:id', userController.getUserById); // autorisation dans le contrôleur
router.put('/:id', userController.updateUser);
router.delete('/:id', authorize('admin'), userController.deleteUser);
router.post('/:id/roles', authorize('admin'), userController.manageRoles);

module.exports = router;