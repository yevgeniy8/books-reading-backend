const mongoose = require('mongoose');
const Joi = require('joi');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            minlength: 2,
            required: [true, 'Set name for user'],
        },
        password: {
            type: String,
            required: [true, 'Set password for user'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
        },
        token: String,
        // accessToken: {
        //     type: String,
        //     default: '',
        // },
        // refreshToken: {
        //     type: String,
        //     default: '',
        // },
    },
    { timestamps: true, versionKey: false }
);

const User = mongoose.model('user', userSchema);

const userRegister = Joi.object({
    name: Joi.string().required().min(2),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

const userLogin = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(8).required(),
});

const schemas = {
    userRegister,
    userLogin,
};

module.exports = { User, schemas };
