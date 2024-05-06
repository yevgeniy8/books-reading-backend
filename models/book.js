const { Schema, model } = require('mongoose');
const Joi = require('joi');
const handleMongooseError = require('../helpers/handleMongooseError');
const integerValidator = require('../helpers/integerValidator');
const regexps = require('../constants/regexps');
const customSchemaMessages = require('../constants/customSchemaMessages');

const bookSchema = new Schema(
    {
        title: {
            type: String,
            minlength: 2,
            maxlength: 255,
            required: true,
        },
        author: {
            type: String,
            minlength: 2,
            maxlength: 255,
            required: true,
        },
        publishYear: {
            type: Number,
            validate: [
                {
                    validator: integerValidator,
                    message: customSchemaMessages.integer,
                },
                {
                    validator(value) {
                        return regexps.publishYear.test(String(value));
                    },
                    message: "Invalid 'publishYear'. Please, use real date.",
                },
            ],
            required: true,
        },
        pagesTotal: {
            type: Number,
            validate: {
                validator: integerValidator,
                message: customSchemaMessages.integer,
            },
            min: 1,
            max: 5000,
            required: true,
        },
        pagesFinished: {
            type: Number,
            validate: [
                {
                    validator(value) {
                        return value <= this.pagesTotal;
                    },
                    message:
                        'The number of pagesFinished must be less than or equal to the number of pagesTotal',
                },
                {
                    validator: integerValidator,
                    message: customSchemaMessages.integer,
                },
            ],
            min: 0,
            default: 0,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        feedback: {
            type: String,
            maxlength: 3000,
            default: null,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    { versionKey: false, timestamps: true }
);

bookSchema.index({ owner: 1, title: 1, author: 1 }, { unique: true });

bookSchema.post('save', handleMongooseError);

const Book = model('book', bookSchema);

const addBookSchema = Joi.object({
    title: Joi.string().min(2).max(255).required(),
    author: Joi.string().min(2).max(255).required(),
    publishYear: Joi.number()
        .integer()
        .min(1000)
        .custom((value, helpers) => {
            if (!regexps.publishYear.test(String(value))) {
                return helpers.message(
                    "Invalid 'publishYear'. Please, use real date."
                );
            }
            return value;
        })
        .options({ convert: false })
        .required(),
    pagesTotal: Joi.number()
        .integer()
        .min(1)
        .max(5000)
        .options({ convert: false })
        .required(),
});

const addBookReviewSchema = Joi.object({
    rating: Joi.number().integer().min(1).max(5).required(),
    feedback: Joi.string().max(3000).allow(''),
});

const schemas = {
    addBookSchema,
    addBookReviewSchema,
};

module.exports = {
    Book,
    schemas,
};
