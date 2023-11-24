const jwt = require('jsonwebtoken');

const createTokens = id => {
    const payload = {
        id,
    };

    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: '1h',
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '23h',
    });

    return { accessToken, refreshToken };
};

module.exports = createTokens;
