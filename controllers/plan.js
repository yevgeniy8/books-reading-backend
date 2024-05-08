const { Plan, schemas } = require('../models/plan');
const { Book } = require('../models/book');
const { History } = require('../models/history');
const { Statistic, schemas: statisticSchemas } = require('../models/statistic');
const HttpError = require('../helpers/HttpError');
const validateTimezone = require('../helpers/validateTimezone');
const { differenceInCalendarDays } = require('date-fns');
const { utcToZonedTime, format } = require('date-fns-tz');

const get = async (req, res, next) => {
    try {
        const { _id: owner } = req.user;
        const { timezone } = req.query;

        validateTimezone(timezone);

        const plan = await Plan.findOne({ owner }).populate(
            'books statistics',
            '-createdAt -updatedAt -owner'
        );

        if (!plan) {
            throw HttpError(404);
        }

        const planResObj = {
            _id: plan._id,
            startDate: plan.startDate,
            endDate: plan.endDate,
            books: plan.books,
            statistics: plan.statistics,
            status: plan.status,
        };

        if (plan.status === 'finished' || plan.status === 'timeover') {
            return res.json({
                ...planResObj,
                pagesPerDay: 0,
            });
        }

        const currentDate = utcToZonedTime(new Date(), timezone);

        const difference = differenceInCalendarDays(
            new Date(plan.endDate),
            currentDate
        );

        if (difference <= 0) {
            const result = await Plan.findByIdAndUpdate(
                plan._id,
                { status: 'timeover' },
                { new: true }
            ).populate('books statistics', '-createdAt -updatedAt -owner');

            return res.json({
                _id: result._id,
                startDate: result.startDate,
                endDate: result.endDate,
                books: result.books,
                statistics: result.statistics,
                status: result.status,
                pagesPerDay: 0,
            });
        }

        const totalPages = plan.books.reduce(
            (acc, book) => acc + book.pagesTotal - book.pagesFinished,
            0
        );

        const pagesPerDay = Math.ceil(totalPages / difference);

        res.json({
            ...planResObj,
            pagesPerDay,
        });
    } catch (error) {
        next(error);
    }
};

const add = async (req, res, next) => {
    try {
        const { error } = schemas.addPlanSchema.validate(req.body);

        if (error) {
            throw HttpError(400, error.message);
        }

        const { startDate, endDate, books: booksIds } = req.body;
        const { _id: owner } = req.user;
        const { timezone } = req.query;

        validateTimezone(timezone);

        const plan = await Plan.findOne({ owner });

        if (plan) {
            throw HttpError(409, 'This user has a plan created.');
        }

        const currentDate = utcToZonedTime(new Date(), timezone);

        const differenceWithCurrentDate = differenceInCalendarDays(
            new Date(startDate),
            currentDate
        );

        const difference = differenceInCalendarDays(
            new Date(endDate),
            new Date(startDate)
        );

        const planStatus = differenceWithCurrentDate <= 0 ? 'active' : 'idle';

        if (differenceWithCurrentDate < 0 || difference < 1) {
            throw HttpError(400, 'Invalid dates');
        }

        const books = await Book.find({ _id: { $in: [...booksIds] }, owner });

        if (books.length !== booksIds.length) {
            throw HttpError(400, "Invalid 'bookId'");
        }

        const totalPages = books.reduce((acc, book) => {
            if (book.pagesTotal === book.pagesFinished) {
                throw HttpError(
                    400,
                    "Invalid 'bookId', you can't add books that you've already read"
                );
            }

            return acc + book.pagesTotal - book.pagesFinished;
        }, 0);

        const pagesPerDay = Math.ceil(totalPages / difference);

        await Plan.create({
            startDate,
            endDate,
            books,
            owner,
            status: planStatus,
        });

        const newPlan = await Plan.findOne({ owner }).populate(
            'books statistics',
            '-createdAt -updatedAt -owner'
        );

        return res.status(201).send({
            _id: newPlan._id,
            startDate: newPlan.startDate,
            endDate: newPlan.endDate,
            books: newPlan.books,
            statistics: newPlan.statistics,
            status: newPlan.status,
            pagesPerDay,
        });
    } catch (error) {
        next(error);
    }
};

const finish = async (req, res, next) => {
    try {
        const { _id: owner } = req.user;
        const { timezone } = req.query;

        validateTimezone(timezone);

        const plan = await Plan.findOne({ owner });

        if (!plan) {
            throw HttpError(404);
        }

        if (plan.status === 'idle') {
            await Plan.findByIdAndRemove(plan._id);

            return res.status(204).send();
        }

        const completionDate = format(
            utcToZonedTime(new Date(), timezone),
            'yyyy-MM-dd'
        );

        const status = plan.status === 'active' ? 'cancel' : plan.status;

        await History.create({
            startDate: plan.startDate,
            endDate: plan.endDate,
            completionDate,
            status,
            statistics: plan.statistics,
            owner,
        });

        await Plan.findByIdAndRemove(plan._id);

        res.status(204).send();
    } catch (error) {
        next(error);
    }
};

const addStatistics = async (req, res, next) => {
    try {
        const { error } = statisticSchemas.addStatisticsSchema.validate(
            req.body
        );

        if (error) {
            throw HttpError(400, error.message);
        }

        const { pagesRead, book: bookId } = req.body;
        const { _id: owner } = req.user;
        const { timezone } = req.query;

        validateTimezone(timezone);

        const plan = await Plan.findOne({ owner }).populate(
            'books',
            '-createdAt -updatedAt -owner'
        );

        if (!plan) {
            throw HttpError(404);
        }

        if (plan.status !== 'active') {
            throw HttpError(400, 'plan is not active');
        }

        const currentDate = utcToZonedTime(new Date(), timezone);

        const date = format(currentDate, 'yyyy-MM-dd');
        const time = format(currentDate, 'HH-mm-ss');

        const differenceWithEndDate = differenceInCalendarDays(
            new Date(plan.endDate),
            currentDate
        );

        if (differenceWithEndDate <= 0) {
            await Plan.findByIdAndUpdate(plan._id, { status: 'timeover' });

            throw HttpError(400, 'timeover');
        }

        const book = await Book.findOne({ _id: bookId, owner });

        if (!book) {
            throw HttpError(400, 'Invalid book id');
        }

        if (book.pagesFinished + pagesRead > book.pagesTotal) {
            throw HttpError(400, 'Invalid pagesRead');
        }

        const totalPages = plan.books.reduce(
            (acc, book) => acc + book.pagesTotal - book.pagesFinished,
            0
        );

        const pagesPerDay = Math.ceil(totalPages / differenceWithEndDate);

        const updatedBook = await Book.findByIdAndUpdate(
            book._id,
            {
                pagesFinished: book.pagesFinished + pagesRead,
            },
            { new: true }
        ).select('-createdAt -updatedAt -owner');

        const isFinishedBook =
            updatedBook.pagesTotal === updatedBook.pagesFinished;

        const { books } = await Plan.findById(plan._id).populate(
            'books',
            '-createdAt -updatedAt -owner'
        );

        const isFinishedPlan =
            books.reduce(
                (acc, book) => acc + book.pagesTotal - book.pagesFinished,
                0
            ) === 0;

        if (isFinishedPlan) {
            await Plan.findByIdAndUpdate(plan._id, { status: 'finished' });
        }

        const { status } = await Plan.findById(plan._id);

        if (plan.statistics.length) {
            const statistics = await Statistic.findOneAndUpdate(
                { owner, date, _id: { $in: [...plan.statistics] } },
                {
                    $push: {
                        currentDateStats: {
                            pagesRead,
                            time,
                            book: bookId,
                            isFinishedBook,
                        },
                    },
                },
                { new: true }
            ).select('-createdAt -updatedAt -owner');

            if (statistics) {
                return res.json({
                    statistics,
                    book: updatedBook,
                    planStatus: status,
                });
            }
        }

        const newStatistic = await Statistic.create({
            date,
            pagesPerDay,
            currentDateStats: {
                pagesRead,
                time,
                book: bookId,
                isFinishedBook,
            },
            plan: plan._id,
            owner,
        });

        await Plan.findByIdAndUpdate(plan._id, {
            $push: { statistics: newStatistic._id },
        });

        res.json({
            statistics: {
                _id: newStatistic._id,
                date: newStatistic.date,
                pagesPerDay: newStatistic.pagesPerDay,
                currentDateStats: newStatistic.currentDateStats,
            },
            book: updatedBook,
            planStatus: status,
        });
    } catch (error) {
        next(error);
    }
};

const changeStatus = async (req, res, next) => {
    try {
        const { error } = schemas.changePlanStatusSchema.validate(req.body);
        if (error) {
            throw HttpError(400, error.message);
        }

        const { _id: owner } = req.user;
        const { status } = req.body;
        const { timezone } = req.query;

        validateTimezone(timezone);

        const plan = await Plan.findOne({ owner });

        if (!plan) {
            throw HttpError(404);
        }

        const currentDate = utcToZonedTime(new Date(), timezone);

        if (status === 'active') {
            const difference = differenceInCalendarDays(
                new Date(plan.startDate),
                currentDate
            );

            if (difference > 0) {
                throw HttpError(400, 'Invalid status');
            }
        }

        if (status === 'timeover') {
            const difference = differenceInCalendarDays(
                new Date(plan.endDate),
                currentDate
            );

            if (difference > 0) {
                throw HttpError(400, 'Invalid status');
            }
        }

        const result = await Plan.findByIdAndUpdate(
            plan._id,
            { status },
            { new: true }
        );

        res.json({
            status: result.status,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    get,
    add,
    finish,
    addStatistics,
    changeStatus,
};
