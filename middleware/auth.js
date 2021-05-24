const jwt = require('jsonwebtoken');
const User = require('../models/User');
exports.protect = async (req, res, next) => {
    let token;
    if (req.cookies.token) {
        token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
        token = req.query.token
    } else if (req.body.token) {
        token = req.body.token
    }
    if (!token) {
        return res.status(401).json({status: -1, message: 'دسترسی غیرمجاز می باشد'}).end();
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findOne({username: decoded.username});
        next();
    } catch (e) {
        console.log(e);
        return res.status(401).json({status: -1, message: 'دسترسی غیرمجاز می باشد'}).end();
    }
};

exports.authorize = (req, res, next) => {
    if (req.user.role !== 2) {
        return res.status(403).json({status: -1, message: 'دسترسی غیرمجاز می باشد'}).end();
    }
    next();
};

