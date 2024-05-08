const { Plan } = require('../models/plan');
const { Book, schemas } = require('../models/book');
const { isValidObjectId } = require('mongoose');
const HttpError = require('../helpers/HttpError');

const getAll = async (req, res, next) => {
    try {
        const { _id: owner } = req.user;

        const result = await Book.find(
            { owner },
            '-owner -createdAt -updatedAt'
        );

        const goingToRead = result.filter(
            ({ pagesFinished }) => pagesFinished === 0
        );

        const currentlyReading = result.filter(
            ({ pagesTotal, pagesFinished }) =>
                pagesFinished !== 0 && pagesTotal !== pagesFinished
        );

        const finishedReading = result.filter(
            ({ pagesTotal, pagesFinished }) => pagesFinished === pagesTotal
        );

        res.json({
            goingToRead,
            currentlyReading,
            finishedReading,
        });
    } catch (error) {
        next(error);
    }
};

const add = async (req, res, next) => {
    try {
        const { error } = schemas.addBookSchema.validate(req.body);

        if (error) {
            throw HttpError(400, error.message);
        }

        const { _id: owner } = req.user;
        const { title, author } = req.body;

        const book = await Book.findOne({ owner, title, author });

        if (book) {
            throw HttpError(409, 'This user already has such a book');
        }

        const result = await Book.create({ ...req.body, owner });

        res.status(201).json({
            _id: result._id,
            title: result.title,
            author: result.author,
            publishYear: result.publishYear,
            pagesTotal: result.pagesTotal,
            pagesFinished: result.pagesFinished,
            rating: result.rating,
            feedback: result.feedback,
        });
    } catch (error) {
        next(error);
    }
};

const deleteById = async (req, res, next) => {
    try {
        const { _id: owner } = req.user;
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            throw HttpError(400, `${id} is not valid id`);
        }

        const { error } = schemas.addBookSchema.validate(req.body);

        if (error) {
            throw HttpError(400, error.message);
        }

        const plan = await Plan.findOne({ owner, books: { $in: [id] } });

        if (plan) {
            throw HttpError(400, 'This book is included in the plan');
        }

        const result = await Book.findOneAndRemove({ _id: id, owner });

        if (!result) {
            throw HttpError(404);
        }

        res.json({
            _id: result._id,
        });
    } catch (error) {
        next(error);
    }
};

const addReview = async (req, res, next) => {
    try {
        const { _id: owner } = req.user;
        const { id: _id } = req.params;

        if (!isValidObjectId(_id)) {
            throw HttpError(400, `${_id} is not valid id`);
        }

        const { error } = schemas.addBookReviewSchema.validate(req.body);

        if (error) {
            throw HttpError(400, error.message);
        }

        const book = await Book.findOne({ _id, owner });

        if (!book) {
            throw HttpError(404);
        }

        if (book.pagesTotal !== book.pagesFinished) {
            throw HttpError(400, 'this book is not finished');
        }

        const updatedBook = await Book.findOneAndUpdate(
            { _id, owner },
            req.body,
            {
                new: true,
            }
        ).select('-createdAt -updatedAt -owner');

        res.json(updatedBook);
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAll,
    add,
    deleteById,
    addReview,
};
