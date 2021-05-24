//---------------import model----------------------------------------------
const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');
const validator = require('validator');
//------------------end----------------------------------------------------
module.exports = {
    async add(req, res) {
        try {
            let userData = {
                name: req.body.name ? req.body.name.trim() : null,
                username: req.body.username ? req.body.username.toLowerCase().trim() : null,
                password: req.body.password ? req.body.password.trim() : null,
                branch_code: req.body.branch_code ? req.body.branch_code : null,
                role: req.body.role ? req.body.role : null,
                room_slug: req.body.room_slug ? req.body.room_slug : null
            };
            if (!userData.name) {
                delete userData.name
            }
            if (!userData.username) {
                return res.status(400).json({status: -1, message: 'لطفا نام کاربری را وارد نمایید'}).end();
            } else if (userData.username.length > 30 || userData.username.length < 4) {
                return res.status(400).json({
                    status: -2,
                    message: 'تعداد حروف نام کاربری باید بین 4 تا 30 حرف باشد'
                }).end();
            }
            if (!userData.password) {
                return res.status(400).json({status: -3, message: 'لطفا رمز عبور را وارد نمایید'}).end();
            } else if (userData.password.length > 30 || userData.password.length < 4) {
                return res.status(400).json({
                    status: -4,
                    message: 'تعداد رقم های رمز عبور باید بین 4 تا 30 رقم باشد'
                }).end();
            }
            if (!userData.role) {
                return res.status(400).json({status: -5, message: 'لطفا نقش را وارد نمایید'}).end();
            } else if (!validator.isInt(userData.role)) {
                return res.status(400).json({status: -6, message: 'نقش معتبر نمی باشد'}).end();
            }
            if (userData.room_slug) {
                if (Array.isArray(userData.room_slug) && userData.room_slug.length > 0) {
                    userData.rooms = await Room.find({slug: {$in: userData.room_slug}}).select('_id')
                } else {
                    const room = await Room.findOne({slug: userData.room_slug}).select('_id')
                    userData.rooms = [room]
                }
            }
            delete userData.room_slug
            await User.create(userData);
            res.status(200).json({status: 1, message: 'کاربر با موفقیت افزوده شد'});
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.username) {
                    return res.status(400).json({status: -7, message: 'نام کاربری از قبل وجود دارد'}).end();
                } else {
                    console.log(err)
                    return res.status(500).json({status: -8, message: 'افزودن کاربر با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err)
                return res.status(500).json({status: -8, message: 'افزودن کاربر با خطا مواجه شد'}).end();
            }
        }
    },
    async edit(req, res) {
        try {
            let userData = {
                name: req.body.name ? req.body.name.trim() : null,
                username: req.body.username ? req.body.username.toLowerCase().trim() : null,
                password: req.body.password ? req.body.password.trim() : null,
                branch_code: req.body.branch_code ? req.body.branch_code : null,
                role: req.body.role ? req.body.role : null,
                room_slug: req.body.room_slug ? req.body.room_slug : null
            };
            if (!userData.name) {
                delete userData.name
            }
            if (!userData.username) {
                return res.status(400).json({status: -1, message: 'لطفا نام کاربری را وارد نمایید'}).end();
            } else if (userData.username.length > 30 || userData.username.length < 4) {
                return res.status(400).json({
                    status: -2,
                    message: 'تعداد حروف نام کاربری باید بین 4 تا 30 حرف باشد'
                }).end();
            }
            if (!userData.password) {
                delete userData.password;
            } else if (userData.password.length > 30 || userData.password.length < 4) {
                return res.status(400).json({
                    status: -3,
                    message: 'تعداد رقم های رمز عبور باید بین 4 تا 30 رقم باشد'
                }).end();
            }
            if (!userData.role) {
                delete userData.role;
            } else if (!validator.isInt(userData.role)) {
                return res.status(400).json({status: -4, message: 'نقش معتبر نمی باشد'}).end();
            }
            if (userData.room_slug) {
                if (Array.isArray(userData.room_slug) && userData.room_slug.length > 0) {
                    userData.rooms = await Room.find({slug: {$in: userData.room_slug}}).select('_id')
                } else {
                    const room = await Room.findOne({slug: userData.room_slug}).select('_id')
                    userData.rooms = [room]
                }
            }
            delete userData.room_slug
            await User.updateOne({username: userData.username}, userData);
            res.status(200).json({status: 1, message: 'ویرایش کاربر با موفقیت انجام شد'});
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.username) {
                    return res.status(400).json({status: -5, message: 'نام کاربری از قبل وجود دارد'}).end();
                } else {
                    console.log(err);
                    return res.status(500).json({status: -6, message: 'ویرایش کاربر با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err);
                return res.status(500).json({status: -6, message: 'ویرایش کاربر با خطا مواجه شد'}).end();
            }
        }
    },
    async delete(req, res) {
        try {
            if (req.body.username) {
                if (Array.isArray(req.body.username)) {
                    if (req.body.username.length === 0) {
                        await User.deleteMany({});
                        await Message.deleteMany({});
                        res.status(200).json({status: 1, message: 'حذف کاربران با موفقیت انجام شد'});
                    } else {
                        const user_ids = await User.find({username: {$in: req.body.username}}).select('_id')
                        if (user_ids) {
                            await User.deleteMany({_id: {$in: user_ids}})
                            await Message.deleteMany({user: {$in: user_ids}})
                            res.status(200).json({status: 1, message: 'حذف کاربر یا کاربران با موفقیت انجام شد'});
                        } else {
                            return res.status(404).json({
                                status: -2,
                                message: 'یک یا چند مورد از کاربران یافت نشدند'
                            }).end()
                        }
                    }
                } else {
                    const user = await User.findOne({username: req.body.username})
                    if (user) {
                        await User.deleteOne({_id: user._id})
                        await Message.deleteMany({user: user._id})
                        return res.status(200).json({status: 1, message: 'حذف کاربر با موفقیت انجام شد'}).end()
                    } else {
                        return res.status(404).json({status: -2, message: 'کاربر یافت نشد'}).end()
                    }
                }
            } else {
                return res.status(400).json({status: -3, message: 'لطفا نام کاربری را وارد نمایید'}).end()
            }
        } catch (e) {
            console.log(e)
            res.status(500).json({status: -1, message: 'حذف کاربر یا کاربران با خطا مواجه شد'})
        }
    },
    async add_user_to_room(req, res) {
        let data = {
            username: req.body.username ? req.body.username.toLowerCase().trim() : null,
            room_slug: req.body.room_slug ? req.body.room_slug.trim() : null
        };
        if (!data.username) {
            return res.status(400).json({status: -1, message: 'لطفا نام کاربری را وارد نمایید'}).end();
        }
        if (!data.room_slug) {
            return res.status(400).json({status: -2, message: 'لطفا عنوان انگلیسی اتاق را وارد نمایید'}).end();
        }
        try {
            const user = await User.findOne({username: data.username})
            if (Array.isArray(data.room_slug) && data.room_slug.length > 0) {
                const rooms = await Room.find({slug: {$in: data.room_slug}}).select('_id')
                if (Array.isArray(user.rooms)) {
                    for (const room_id of rooms) {
                        if (!user.rooms.includes(room_id)) {
                            user.rooms.push(room_id)
                        }
                    }
                } else {
                    user.rooms = rooms
                }
            } else {
                const room = await Room.findOne({slug: data.room_slug})
                if (!user.rooms.includes(room._id)) {
                    user.rooms = [...user.rooms, room._id]
                }
            }
            await user.save()
            return res.status(200).json({status: 1, message: 'کاربر با موفقیت به اتاق اضافه شد'}).end()
        } catch (e) {
            console.log(e)
            return res.status(500).json({status: -3, message: 'افزودن کاربر به اتاق با خطا مواجه شد'}).end()
        }
    },
    async remove_user_from_room(req, res) {
        let data = {
            username: req.body.username ? req.body.username.toLowerCase().trim() : null,
            room_slug: req.body.room_slug ? req.body.room_slug.trim() : null
        };
        if (!data.username) {
            return res.status(400).json({status: -1, message: 'لطفا نام کاربری را وارد نمایید'}).end();
        }
        if (!data.room_slug) {
            return res.status(400).json({status: -2, message: 'لطفا عنوان انگلیسی اتاق را وارد نمایید'}).end();
        }
        try {
            const user = await User.findOne({username: data.username})
            if (Array.isArray(data.room_slug) && data.room_slug.length > 0) {
                const rooms = await Room.find({slug: {$in: data.room_slug}}).select('_id')
                if (Array.isArray(user.rooms)) {
                    for (const room_id of rooms) {
                        if (user.rooms.includes(room_id)) {
                            user.rooms = user.rooms.filter(r => r !== room_id)
                        }
                    }
                } else {
                    user.rooms = []
                }
            } else {
                const room = await Room.findOne({slug: data.room_slug})
                user.rooms = user.rooms.filter(r => r !== room._id)
            }
            await user.save()
            return res.status(200).json({status: 1, message: 'کاربر با موفقیت از اتاق حذف شد'}).end()
        } catch (e) {
            console.log(e)
            return res.status(500).json({status: -3, message: 'حذف کاربر از اتاق با خطا مواجه شد'}).end()
        }
    },
    async user_rooms(req, res) {
        try {
            if (req.body.username) {
                const rooms = await User.find({username: req.body.username}).populate('rooms')
                if (rooms) {
                    return res.status(200).json({status: 1, rooms});
                } else {
                    return res.status(404).json({status: -1, message: 'کاربر مورد نظر یافت نشد'})
                }
            } else {
                return res.status(400).json({status: -2, message: 'نام کاربری نامعتبر می باشد'})
            }
        } catch (e) {
            console.log(e)
            return res.status(500).json({status: -3, message: 'دریافت اتاق های کاربر با خطا مواجه شد'})
        }
    },
    async delete_branch(req, res) {
        try {
            if (req.body.code) {
                if (Array.isArray(req.body.code)) {
                    if (req.body.code.length === 0) {
                        await User.deleteMany({});
                        await Room.deleteMany({});
                    } else {
                        await User.deleteMany({branch_code: {$in: req.body.code}})
                        await Room.deleteMany({branch_code: {$in: req.body.code}})
                    }
                } else {
                    await User.deleteMany({branch_code: req.body.code})
                    await Room.deleteMany({branch_code: req.body.code})
                }
            } else {
                return res.status(400).json({status: -2, message: 'لطفا کد شاخه را وارد نمایید'}).end()
            }
            return res.status(200).json({status: 1, message: 'حذف شاخه با موفقیت انجام شد'}).end()
        } catch (e) {
            console.log(e)
            return res.status(500).json({status: -1, message: 'حذف شاخه با خطا مواجه شد'}).end()
        }
    },
};
