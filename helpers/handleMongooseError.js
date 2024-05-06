const handleMongooseError = (err, _, next) => {
    const { name, code } = err;
    err.status = name === 'MongoServerError' && code === 11000 ? 409 : 400;
    next();
};

module.exports = handleMongooseError;
