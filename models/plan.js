const { Schema, model, isValidObjectId } = require('mongoose');
const Joi = require('joi');
const handleMongooseError = require('../helpers/handleMongooseError');
const regexps = require('../constants/regexps');

const planSchema = new Schema(
    {
        startDate: {
            type: String,
            match: regexps.date,
            required: true,
        },
        endDate: {
            type: String,
            match: regexps.date,
            required: true,
        },
        books: {
            type: [Schema.Types.ObjectId],
            ref: 'book',
            validate: [
                {
                    validator(value) {
                        return !(value.length < 1 || value.length > 20);
                    },
                    message:
                        'The length of the books array must be at least 1 and not more than 20',
                },
                {
                    validator(value) {
                        return value
                            .map(bookId => bookId.toString())
                            .every(
                                (bookId, _, arr) =>
                                    arr.indexOf(bookId) ===
                                    arr.lastIndexOf(bookId)
                            );
                    },
                    message: 'id books must be unique',
                },
            ],
            required: true,
        },
        statistics: {
            type: [Schema.Types.ObjectId],
            ref: 'statistic',
            default: [],
        },
        status: {
            type: String,
            enum: ['idle', 'active', 'finished', 'timeover'],
            default: 'idle',
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            unique: true,
            required: true,
        },
    },
    { versionKey: false, timestamps: true }
);

planSchema.post('save', handleMongooseError);

const Plan = model('plan', planSchema);

const addPlanSchema = Joi.object({
    startDate: Joi.string().pattern(regexps.date).required(),
    endDate: Joi.string().pattern(regexps.date).required(),
    books: Joi.array()
        .items(
            Joi.custom((value, helpers) => {
                if (!isValidObjectId(value)) {
                    return helpers.message(`${value} is not valid id`);
                }
                return value;
            })
        )
        .custom((value, helpers) => {
            const isValid = value.every((bookId, _, arr) => {
                return arr.indexOf(bookId) === arr.lastIndexOf(bookId);
            });
            if (!isValid) {
                return helpers.message('id books must be unique');
            }
            return value;
        })
        .min(1)
        .max(20)
        .required(),
});

const changePlanStatusSchema = Joi.object({
    status: Joi.string().valid('active', 'timeover').required(),
});

const schemas = {
    addPlanSchema,
    changePlanStatusSchema,
};

module.exports = {
    Plan,
    schemas,
};
