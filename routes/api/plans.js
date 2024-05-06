const express = require('express');
const auth = require('../../middlewares/auth');
const PlansControllers = require('../../controllers/plan');

const router = express.Router();

router.get('/', auth, PlansControllers.get);

router.post('/', auth, PlansControllers.add);

router.patch('/', auth, PlansControllers.changeStatus);

router.delete('/', auth, PlansControllers.finish);

router.patch('/statistics', auth, PlansControllers.addStatistics);

module.exports = router;
