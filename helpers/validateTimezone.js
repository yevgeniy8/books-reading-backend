const HttpError = require('./HttpError');

const validateTimezone = timezone => {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone });
    } catch {
        throw HttpError(400, 'Invalid timezone');
    }
};

module.exports = validateTimezone;
