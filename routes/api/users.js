const express = require('express');
const auth = require('../../middlewares/auth');

const UserControllers = require('../../controllers/user');

const router = express.Router();

router.post('/register', UserControllers.register);

router.post('/login', UserControllers.login);

router.post('/logout', auth, UserControllers.logout);

router.get('/current', auth, UserControllers.getCurrent);

module.exports = router;
