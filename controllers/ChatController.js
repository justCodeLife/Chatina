//---------------import model----------------------------------------------
const User = require('../models/User');
const Room = require('../models/Room');
const validator = require('validator');
const ftp = require("basic-ftp")
//------------------end----------------------------------------------------
module.exports = {
    async run_chat(req, res) {
        let data = {
            name: req.body.name ? req.body.name.trim() : null,
            username: req.body.username ? req.body.username.toLowerCase().trim() : null,
            password: req.body.password ? req.body.password.trim() : null,
            branch_code: req.body.branch_code ? req.body.branch_code : null,
            role: req.body.role ? req.body.role : null,
            room_slug: req.body.room_slug ? req.body.room_slug : null,
            room_title: req.body.room_title ? req.body.room_title.trim() : null,
            voice_length_limit: req.body.voice_length_limit ? req.body.voice_length_limit : null,
        };
        if (!data.name) {
            delete data.name
        }
        if (!data.username) {
            return res.status(400).json({status: -1, message: 'لطفا نام کاربری را وارد نمایید'}).end();
        } else if (data.username.length > 30 || data.username.length < 4) {
            return res.status(400).json({
                status: -2,
                message: 'تعداد حروف نام کاربری باید بین 4 تا 30 حرف باشد'
            }).end();
        }
        if (!data.password) {
            return res.status(400).json({status: -3, message: 'لطفا رمز عبور را وارد نمایید'}).end();
        } else if (data.password.length > 30 || data.password.length < 4) {
            return res.status(400).json({
                status: -4,
                message: 'تعداد رقم های رمز عبور باید بین 4 تا 30 رقم باشد'
            }).end();
        }
        if (!data.branch_code) {
            return res.status(400).json({status: -5, message: 'لطفا کد شاخه را وارد نمایید'}).end();
        }
        if (!data.role) {
            return res.status(400).json({status: -6, message: 'لطفا نقش را وارد نمایید'}).end();
        } else if (!validator.isInt(data.role)) {
            return res.status(400).json({status: -7, message: 'نقش معتبر نمی باشد'}).end();
        }
        if (!data.room_title) {
            return res.status(400).json({status: -8, message: 'لطفا عنوان فارسی اتاق را وارد نمایید'});
        }
        if (!data.voice_length_limit) {
            delete data.voice_length_limit
        } else if (data.voice_length_limit && !validator.isInt(data.voice_length_limit)) {
            return res.status(400).json({status: -9, message: 'محدودیت صدا نامعتبر می باشد'});
        }
        if (!data.room_slug) {
            return res.status(400).json({status: -10, message: 'لطفا عنوان انگلیسی اتاق را وارد نمایید'}).end();
        }

        let user = null, room = null;
        try {
            user = await User.create({
                name: data.name,
                username: data.username,
                password: data.password,
                branch_code: data.branch_code,
                role: data.role
            })
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.username) {
                    user = await User.findOne({username: data.username})
                    user.name = data.name
                    user.username = data.username
                    user.branch_code = data.branch_code
                    user.role = data.role
                    await user.save()
                } else {
                    console.log(err)
                    return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err)
                return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
            }
        }
        try {
            room = await Room.create({
                branch_code: data.branch_code,
                slug: data.room_slug,
                title: data.room_title,
                voice_length_limit: data.voice_length_limit,
                users: [user?._id]
            })
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.slug) {
                    room = await Room.findOne({slug: data.room_slug})
                    if (!room.users.includes(user._id)) {
                        room.users = [...room.users, user._id]
                        await room.save()
                    }
                } else {
                    console.log(err)
                    return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err)
                return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
            }
        }

        try {
            const client = new ftp.Client(3000)
            await client.access({
                host: process.env.FTP_HOST,
                user: process.env.FTP_USER,
                password: process.env.FTP_PASS,
            })
            await client.ensureDir(`${data.branch_code}/ogg`)
            client.close()
        } catch (err) {
            console.log(err)
            return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
        }

        try {
            if (!user.rooms.includes(room._id)) {
                user.rooms = [...user.rooms, room._id]
                await user.save()
            }
        } catch (err) {
            console.log(err)
            return res.status(500).json({status: -11, message: 'عملیات با خطا مواجه شد'}).end();
        }
        return res.status(200).json({status: 1, message: 'عملیات با موفقیت انجام شد'}).end()
    }
}
