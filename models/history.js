const { Schema, model } = require('mongoose');
const handleMongooseError = require('../helpers/handleMongooseError');
const regexps = require('../constants/regexps');

const historySchema = new Schema(
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
        completionDate: {
            type: String,
            match: regexps.date,
            required: true,
        },
        status: {
            type: String,
            enum: ['cancel', 'finished', 'timeover'],
            required: true,
        },
        statistics: {
            type: [Schema.Types.ObjectId],
            ref: 'statistic',
            default: [],
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'user',
            required: true,
        },
    },
    { versionKey: false, timestamps: true }
);

historySchema.post('save', handleMongooseError);

const History = model('history', historySchema);

module.exports = {
    History,
};
