const { User, schemas } = require('../models/user');
const bcryptjs = require('bcryptjs');
const HttpError = require('../helpers/HttpError');
// const jwt = require('jsonwebtoken');
// const queryString = require('querystring');
const queryString = require('query-string');
const createTokens = require('../helpers/createTokens');

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
        const newUser = await User.create({
            ...req.body,
            password: passwordHash,
        });

        // const doc = await User.create({ ...req.body, password: passwordHash });

        // res.status(201).json({
        //     user: { name: doc.name, email: doc.email },
        // });

        res.status(201).json({
            name: newUser.name,
            email: newUser.email,
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

        // const payload = {
        //     id: doc._id,
        // };

        // const token = jwt.sign(payload, process.env.JWT_SECRET, {
        //     expiresIn: '23h',
        // });

        const { accessToken, refreshToken } = createTokens(doc._id);

        const user = await User.findByIdAndUpdate(
            { _id: doc._id },
            { accessToken, refreshToken }
        );

        // const user = await User.findByIdAndUpdate({ _id: doc._id }, { token });

        // res.status(200).json({
        //     accessToken,
        //     refreshToken,
        //     user: {
        //         name: user.name,
        //         email: user.email,
        //     },
        // });

        res.json({
            userData: {
                name: user.name,
                email: user.email,
            },
            accessToken,
            refreshToken,
        });

        // res.status(200).json({
        //     token,
        //     user: {
        //         name: user.name,
        //         email: user.email,
        //     },
        // });
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

        // await User.findByIdAndUpdate({ _id }, { token: '' });
        await User.findByIdAndUpdate(_id, {
            accessToken: '',
            refreshToken: '',
        });

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

        // console.log(`${process.env.BASE_URL}/users/google-redirect`);

        return res.redirect(
            `https://accounts.google.com/o/oauth2/v2/auth?${stringifiedParams}`
        );
    } catch (error) {
        next(error);
    }
};

const googleRedirect = async (req, res, next) => {
    // console.log('object');
    try {
        const fullUrl = `${req.protocol}://${req.get('host')}${
            req.originalUrl
        }`;
        const urlObj = new URL(fullUrl);
        const urlParams = queryString.parse(urlObj.search);
        const code = urlParams.code;
        // const code = urlParams['?code'];

        // console.log(urlParams);

        // console.log(queryString.parse(urlObj.search.split('?')[1]).code);
        // console.log(urlObj.searchParams.get('code'));

        const tokenData = await axios({
            url: `https://oauth2.googleapis.com/token`,
            method: 'post',
            data: {
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: `${process.env.BASE_URL}/users/google-redirect`,
                grant_type: 'authorization_code',
                // code: '4/0AfJohXnc-F1MBjyhjQDzUuPhps66kQl8p7WE1v1d2dxjAI4RtDaBCs_mvmnw9d42BMrbtQ',
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
        return res.redirect(
            `${process.env.FRONTEND_URL}?email=${userData.data.email}`
        );
    } catch (error) {
        // console.log(error);
        next(error);
    }
};

const refresh = async (req, res, next) => {
    try {
        const { _id } = req.user;

        const { accessToken, refreshToken } = createTokens(_id);

        await User.findByIdAndUpdate({ _id }, { accessToken, refreshToken });

        res.status(200).json({
            accessToken,
            refreshToken,
        });
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
    refresh,
};
