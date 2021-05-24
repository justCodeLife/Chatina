const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');
const SendTokenResponse = async (user, statusCode, res) => {
    try {
        const token = user.getSignedJwtToken();
        const options = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        };
        res.status(statusCode).cookie('token', token, options).json({status: 1, token, user});
    } catch (e) {
        console.log(e)
        return res.json({status: -1, message: 'ارسال توکن با خطا مواجه شد'}).end();
    }
};
exports.login = async (req, res, next) => {	
    try {
        let userData = {
            username: req.body.username ? req.body.username.toLowerCase().trim() : null,
            password: req.body.password ? req.body.password.trim() : null,
        };
        if (!userData.username || !userData.password) {
            return res.json({status: -1, message: 'نام کاربری یا رمز عبور نامعتبر است'}).end();
        }
        const user = await User.findOne({
            username: userData.username, password: userData.password
        });
        if (!user) {
            return res.json({status: -1, message: 'نام کاربری یا رمز عبور نامعتبر است'}).end();
        }
        await SendTokenResponse(user, 200, res);
    } catch (e) {
        console.log(e)
        return res.json({status: -2, message: 'ورود با خطا مواجه شد'}).end();
    }
};
exports.logout = async (req, res, next) => {
    res.clearCookie('token', {
        httpOnly: true,
        //todo secure: true
    }).json({status: 1, message: 'خروج با موفقیت انجام شد'});
};
exports.getLoggedInUser = async (req, res, next) => {
    try {
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
            return res.json({error: 'شما وارد نشده اید'}).end();
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({username: decoded.username});
        if (!user) {
            return res.json({error: 'کاربر مورد نظر یافت نشد'}).end();
        }
        return res.json(user).end();
    } catch (e) {
        console.log(e)
        return res.json({error: 'دریافت اطلاعات با خطا مواجه شد'}).end();
    }
};
exports.init_data = async (req, res, next) => {
    if (!req.body.room) {
        return res.json({error: 'عنوان اتاق نامعتبر است'}).end()
    }
    try {
        const room = await Room.findOne({slug: req.body.room})
        if (!room) {
            return res.json({error: 'اتاق مورد نظر یافت نشد'}).end()
        }
        const pages_count = Math.ceil(await Message.countDocuments({room: room._id}) / 50)
        return res.json({pages_count, room})
    } catch (e) {
        console.log(e);
        return res.json({error: 'دریافت اطلاعات با خطا مواجه شد'}).end();
    }
};
