const { Schema, model, isValidObjectId } = require('mongoose');
const Joi = require('joi');
const handleMongooseError = require('../helpers/handleMongooseError');
const regexps = require('../constants/regexps');

const currentDateStatsSchema = new Schema({
    pagesRead: {
        type: Number,
        required: true,
    },
    time: {
        type: String,
        match: regexps.time,
        required: true,
    },
    book: {
        type: Schema.Types.ObjectId,
        ref: 'book',
        required: true,
    },
    isFinishedBook: {
        type: Boolean,
        default: false,
    },
});

const statisticSchema = new Schema(
    {
        date: {
            type: String,
            match: regexps.date,
            required: true,
        },
        pagesPerDay: {
            type: Number,
            required: true,
        },
        currentDateStats: {
            type: [currentDateStatsSchema],
            validate: {
                validator: function (stats) {
                    return stats && stats.length > 0;
                },
                message:
                    "The 'currentDateStats' array must contain at least one stat.",
            },
            required: true,
        },
        plan: {
            type: Schema.Types.ObjectId,
            ref: 'plan',
            required: true,
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    { versionKey: false, timestamps: true }
);

statisticSchema.index(
    { date: 1, owner: 1, plan: 1 },
    {
        unique: true,
    }
);

statisticSchema.post('save', handleMongooseError);

const Statistic = model('statistic', statisticSchema);

const addStatisticsSchema = Joi.object({
    pagesRead: Joi.number().required(),
    book: Joi.string()
        .custom((value, helpers) => {
            if (!isValidObjectId(value)) {
                return helpers.message(`${value} is not valid id`);
            }
            return value;
        })
        .required(),
});

const schemas = {
    addStatisticsSchema,
};

module.exports = {
    Statistic,
    schemas,
};
