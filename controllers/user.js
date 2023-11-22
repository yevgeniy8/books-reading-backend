const { User, schemas } = require('../models/user');
const bcryptjs = require('bcryptjs');
const HttpError = require('../helpers/HttpError');
const jwt = require('jsonwebtoken');

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

module.exports = { register, login };
