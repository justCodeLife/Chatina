//---------------import model----------------------------------------------
const Room = require('../models/Room');
const User = require('../models/User');
const Message = require('../models/Message');
const validator = require('validator');
//------------------end----------------------------------------------------
module.exports = {
    async add(req, res) {
        try {
            let roomData = {
                title: req.body.title ? req.body.title.trim() : null,
                slug: req.body.slug ? req.body.slug.trim() : null,
                branch_code: req.body.branch_code ? req.body.branch_code : null,
                voice_length_limit: req.body.voice_length_limit ? req.body.voice_length_limit : null,
                users_username: req.body.users_username ? req.body.users_username : null
            };
            if (!roomData.title) {
                return res.status(400).json({status: -1, message: 'لطفا عنوان فارسی را وارد نمایید'});
            }
            if (!roomData.slug) {
                return res.status(400).json({status: -2, message: 'لطفا عنوان انگلیسی را وارد نمایید'});
            }
            if (!roomData.voice_length_limit) {
                delete roomData.voice_length_limit
            } else if (roomData.voice_length_limit && !validator.isInt(roomData.voice_length_limit)) {
                return res.status(400).json({status: -3, message: 'محدودیت صدا نامعتبر می باشد'});
            }
            if (roomData.users_username) {
                if (Array.isArray(roomData.users_username) && roomData.users_username.length > 0) {
                    const users = await User.find({username: {$in: roomData.users_username}}).select('_id')
                    if (users) {
                        roomData.users = users
                    }
                } else {
                    const user = await User.findOne({username: roomData.users_username}).select('_id')
                    if (user) {
                        roomData.users = [user]
                    }
                }
            }
            delete roomData.users_username
            await Room.create(roomData);
            res.status(200).json({status: 1, message: 'اتاق با موفقیت افزوده شد'});
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.slug) {
                    return res.status(400).json({status: -5, message: 'عنوان انگلیسی از قبل وجود دارد'}).end();
                } else {
                    console.log(err);
                    return res.status(500).json({status: -6, message: 'افزودن اتاق با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err);
                return res.status(500).json({status: -6, message: 'افزودن اتاق با خطا مواجه شد'}).end();
            }
        }
    },
    async edit(req, res) {
        try {
            let roomData = {
                title: req.body.title ? req.body.title.trim() : null,
                branch_code: req.body.branch_code ? req.body.branch_code : null,
                voice_length_limit: req.body.voice_length_limit ? req.body.voice_length_limit : null,
                users_username: req.body.users_username ? req.body.users_username : null
            };
            if (!roomData.title) {
                delete roomData.title
            }
            if (!roomData.voice_length_limit) {
                delete roomData.voice_length_limit
            } else if (roomData.voice_length_limit && !validator.isInt(roomData.voice_length_limit)) {
                return res.status(400).json({status: -2, message: 'محدودیت صدا نامعتبر می باشد'}).end();
            }
            if (roomData.users_username) {
                if (Array.isArray(roomData.users_username) && roomData.users_username.length > 0) {
                    const users = await User.find({username: {$in: roomData.users_username}}).select('_id')
                    if (users) {
                        roomData.users = users
                    }
                } else {
                    const user = await User.findOne({username: roomData.users_username}).select('_id')
                    if (user) {
                        roomData.users = [user]
                    }
                }
            }
            delete roomData.users_username
            await Room.updateOne({slug: req.body.slug}, roomData);
            res.status(200).json({status: 1, message: 'اتاق با موفقیت ویرایش شد'});
        } catch (err) {
            if (err.name === 'MongoError' && err.code === 11000) {
                if (err.keyValue.slug) {
                    return res.status(400).json({status: -4, message: 'عنوان انگلیسی از قبل وجود دارد'}).end();
                } else {
                    console.log(err);
                    return res.status(500).json({status: -5, message: 'ویرایش اتاق با خطا مواجه شد'}).end();
                }
            } else {
                console.log(err);
                return res.status(500).json({status: -5, message: 'ویرایش اتاق با خطا مواجه شد'}).end();
            }
        }
    },
    async delete(req, res) {
        if (req.body.slug) {
            try {
                if (Array.isArray(req.body.slug)) {
                    if (req.body.slug.length === 0) {
                        await Room.deleteMany({});
                        await Message.deleteMany({});
                    } else {
                        const room_ids = await Room.find({slug: {$in: req.body.slug}}).select('_id')
                        await Room.deleteMany({_id: {$in: room_ids}});
                        await Message.deleteMany({room: {$in: room_ids}});
                    }
                } else {
                    const room = await Room.findOne({slug: req.body.slug})
                    await Message.deleteMany({room: room._id})
                    await Room.deleteOne({_id: room._id})
                }
                res.status(200).json({status: 1, message: 'حذف اتاق یا اتاق ها با موفقیت انجام شد'})
            } catch (err) {
                console.log(err);
                res.status(500).json({status: -1, message: 'حذف اتاق یا اتاق ها با خطا مواجه شد'})
            }
        } else {
            return res.status(400).json({status: -2, message: 'لطفا عنوان انگلیسی اتاق را وارد نمایید'}).end()
        }
    },
    async room_users(req, res) {
        try {
            if (req.body.slug) {
                const users = await Room.findOne({slug: req.body.slug}).populate('users')
                if (users) {
                    return res.status(200).json({status: 1, users})
                } else {
                    return res.status(404).json({status: -1, message: 'اتاق یافت نشد'})
                }
            } else {
                return res.status(400).json({status: -2, message: 'عنوان انگلیسی اتاق نامعتبر می باشد'})
            }
        } catch (e) {
            console.log(e)
            return res.status(500).json({status: -3, message: 'دریافت اطلاعات با خطا مواجه شد'})
        }
    },
    async room_messages(req, res) {
        let messages;
        const search = req.body.search ? req.body.search.trim().replace(/[^\w\s]/gi, '') : null;
        const skip = ((parseInt(req.body.page, 10) || 1) - 1) * 50;
        try {
            if (!search) {
                messages = await Message.find({room: req.body.room_id}).populate('user').skip(skip).limit(50).sort('created_at');
            } else {
                messages = await Message.find({
                    room: req.body.room_id,
                    message: {$regex: '.*' + search + '.*'}
                }).sort('created_at').select('_id')
                messages = messages.map(m => m._id)
            }


            console.log(messages)


            return res.status(200).json(messages).end();
        } catch (e) {
            console.log(e);
            return res.status(500).json({error: 'دریافت اطلاعات با خطا مواجه شد'}).end();
        }
    },
    async upload_file(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({error: "فایل نامعتبر است"});
            } else {
                return res.json({
                    success: 'فایل با موفقیت آپلود شد',
                    path: req.file.path,
                    name: req.file.name,
                    ext: req.file.extension,
                    title: req.file.title,
                    size: req.file.size,
                    element_id: req.body.element_id
                })
            }
        } catch (e) {
            console.log(e)
        }
    }
};
