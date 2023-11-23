const express = require('express');
const auth = require('../../middlewares/auth');

const UserControllers = require('../../controllers/user');

const router = express.Router();

router.post('/register', UserControllers.register);

router.post('/login', UserControllers.login);

router.post('/logout', auth, UserControllers.logout);

router.get('/current', auth, UserControllers.getCurrent);

router.get('/google', UserControllers.googleAuth);

router.get('/google-redirect', UserControllers.googleRedirect);

module.exports = router;
