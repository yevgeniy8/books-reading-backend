const HttpError = require('../helpers/HttpError');
const jwt = require('jsonwebtoken');
const { User } = require('../models/user');

const auth = (req, res, next) => {
    try {
        const { authorization = '' } = req.headers;
        const [bearer, refreshToken] = authorization.split(' ');

        if (bearer !== 'Bearer') {
            throw HttpError(401, 'Not authorized');
        }

        jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET,
            async (err, decode) => {
                if (err) {
                    if (err.name === 'TokenExpiredError') {
                        return next(HttpError(401, 'Token is expired'));
                    }
                }

                if (!decode) {
                    return next(HttpError(401, 'Not authorized'));
                }

                const user = await User.findOne({ _id: decode.id });

                if (
                    !user ||
                    !user.refreshToken ||
                    refreshToken !== user.refreshToken
                ) {
                    return next(HttpError(401, 'Not authorized'));
                }

                req.user = user;
                next();
            }
        );
    } catch (error) {
        next(error);
    }
};

module.exports = auth;
