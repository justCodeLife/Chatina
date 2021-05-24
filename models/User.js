const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    username: {
        type: String,
        unique: true
    },
    password: {
        type: String,
        select: false
    },
    branch_code: {
        type: String,
    },
    role: {
        type: Number
    },
    rooms: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Room'
        }
    ]
}, {
    timestamps: false,
    versionKey: false
});
UserSchema.index({name: 1, username: 1});
const User = mongoose.model('User', UserSchema);
User.prototype.getSignedJwtToken = function () {
    return jwt.sign({username: this.username}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

module.exports = User;
