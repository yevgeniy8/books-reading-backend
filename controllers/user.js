const { User, schemas } = require('../models/user');
const bcryptjs = require('bcryptjs');
const HttpError = require('../helpers/HttpError');
const jwt = require('jsonwebtoken');
const queryString = require('querystring');
const axios = require('axios');

const register = async (req, res, next) => {
    try {
        const { error } = schemas.userRegister.validate(req.body);
        const { email, password } = req.body;
        if (error) {
            throw HttpError(400, error.message);
        }

        const user = await User.findOne({ email });

        if (user) {
            throw HttpError(409, 'Email on use');
        }

        const passwordHash = await bcryptjs.hash(password, 10);
        const doc = await User.create({ ...req.body, password: passwordHash });

        res.status(201).json({
            user: { name: doc.name, email: doc.email },
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { error } = schemas.userLogin.validate(req.body);
        const { email, password } = req.body;
        if (error) {
            throw HttpError(400, error.message);
        }

        const doc = await User.findOne({ email });

        if (!doc) {
            throw HttpError(401, 'Email or password is wrong');
        }

        const passwordCompare = await bcryptjs.compare(password, doc.password);

        if (!passwordCompare) {
            throw HttpError(401, 'Email or password is wrong');
        }

        const payload = {
            id: doc._id,
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '23h',
        });

        const user = await User.findByIdAndUpdate(
            { _id: payload.id },
            { token }
        );

        res.status(200).json({
            token,
            user: {
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        next(error);
    }
};

const logout = async (req, res, next) => {
    try {
        const { _id } = req.user;
        const user = await User.findOne({ _id });
        if (!user) {
            throw HttpError(401, 'Not authorized');
        }

        await User.findByIdAndUpdate({ _id }, { token: '' });

        res.status(204).end();
    } catch (error) {
        next(error);
    }
};

const getCurrent = async (req, res, next) => {
    try {
        const { _id, name, email } = req.user;
        const user = await User.findOne({ _id });

        if (!user) {
            throw HttpError(401, 'Not authorized');
        }

        res.status(200).json({
            name,
            email,
        });
    } catch (error) {
        next(error);
    }
};

const googleAuth = async (req, res, next) => {
    try {
        const stringifiedParams = queryString.stringify({
            client_id: process.env.GOOGLE_CLIENT_ID,
            redirect_uri: `${process.env.BASE_URL}/users/google-redirect`,
            scope: [
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
            ].join(' '),
            response_type: 'code',
            access_type: 'offline',
            prompt: 'consent',
        });
        return res.redirect(
            `https://accounts.google.com/o/oauth2/v2/auth?${stringifiedParams}`
        );
    } catch (error) {
        next(error);
    }
};

const googleRedirect = async (req, res, next) => {
    try {
        const fullUrl = `${req.protocol}://${req.get('host')}${
            req.originalUrl
        }`;
        const urlObj = new URL(fullUrl);
        const urlParams = queryString.parse(urlObj.search);
        const code = urlParams.code;
        const tokenData = await axios({
            url: `https://oauth2.googleapis.com/token`,
            method: 'post',
            data: {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${process.env.BASE_URL}/users/google-redirect`,
                grant_type: 'authorization_code',
                code,
            },
        });
        const userData = await axios({
            url: 'https://www.googleapis.com/oauth2/v2/userinfo',
            method: 'get',
            headers: {
                Authorization: `Bearer ${tokenData.data.access_token}`,
            },
        });

        // userData.data.email
        // ...
        // ...
        // ...
        // return res.redirect(
        //     `${process.env.FRONTEND_URL}?email=${userData.data.email}`
        // );
        return res.redirect(
            `http://localhost:3000?email=${userData.data.email}`
        );
    } catch (error) {
        next(error);
    }
};

module.exports = {
    register,
    login,
    logout,
    getCurrent,
    googleAuth,
    googleRedirect,
};
