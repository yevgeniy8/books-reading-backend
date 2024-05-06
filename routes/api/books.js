const express = require('express');
const auth = require('../../middlewares/auth');
const BooksControllers = require('../../controllers/books');

const router = express.Router();

router.get('/', auth, BooksControllers.getAll);

router.post('/', auth, BooksControllers.add);

router.delete('/:id', auth, BooksControllers.deleteById);

router.patch('/:id/review', auth, BooksControllers.addReview);

module.exports = router;
