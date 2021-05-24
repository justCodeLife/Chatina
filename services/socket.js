const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');
const moment = require('jalali-moment');
const users = []
const fs = require('fs').promises
const {uuid} = require('uuidv4');
const ftp = require("basic-ftp")

module.exports = (io) => {
    io.on('connection', async (socket) => {
        socket.username = socket.handshake.query.username;
        socket.user_id = socket.handshake.query.user_id;
        socket.room = socket.handshake.query.room;
        try {
            let user;
            const usr = await User.findOne({username: socket.username}).populate('rooms')
            socket.name = usr.name;
            if (usr && usr.rooms.some(r => r.slug === socket.room)) {
                user = users.find(u => u.username === socket.username)
                if (!user) {
                    users.push({
                        socket_id: socket.id,
                        user_id: socket.user_id,
                        username: socket.username,
                        name: socket.name,
                        rooms: [socket.room]
                    })
                    socket.join(socket.room);
                    user = users.find(u => u.username === socket.username)
                    socket.to(socket.room).emit('addJoinedUserElement', {user})
                } else {
                    if (user.rooms && user.rooms.includes(socket.room)) {
                        socket.disconnect()
                    } else {
                        user.rooms = [...user.rooms, socket.room]
                    }
                }
                if (usr.role === 2) {
                    const room_users = users.filter(usr => usr.rooms.includes(socket.room))
                    socket.emit('roomOnlineUsers', room_users)
                }
            } else {
                socket.disconnect()
            }
        } catch (e) {
            console.log(e)
        }
        socket.on('disconnect', async () => {
            try {
                const index = users.findIndex(t => t.username === socket.username)
                const user = users[index];
                if (users.length > 0 && user && user.rooms && user.rooms.includes(socket.room)) {
                    socket.to(socket.room).emit('deleteRemovedUserElement', {user_id: user.user_id})
                }
                if (user?.rooms && user.rooms.length > 1) {
                    user.rooms = user.rooms.filter(r => r !== socket.room)
                } else {
                    users.splice(index, 1)
                }
            } catch (e) {
                console.log(e)
            }
        });
        socket.on('message', async ({room_id, user_id, message}) => {
            try {
                let message_id;
                Message.create({
                    room: room_id,
                    user: user_id,
                    message,
                    is_file: false,
                    created_at: Date.now()
                }).then(msg => {
                    message_id = msg._id
                }).catch(e => {
                    console.log(e)
                })
                const room = await Room.findById(room_id)
                socket.to(room.slug).emit('message', {
                    id: message_id,
                    room_id,
                    user_id,
                    message,
                    created_at: moment().locale('fa').format('HH:mm:ss YYYY/M/D'),
                    name: socket.name
                })
            } catch (e) {
                console.log(e)
            }
        })
        socket.on('voice', async (blob, room) => {
            try {
                let message_id;
                const rand = uuid()
                await fs.writeFile(`public/files/${rand}.ogg`, blob);
                const r = await Room.findById(room._id)
                const client = new ftp.Client()
                await client.access({
                    host: process.env.FTP_HOST,
                    user: process.env.FTP_USER,
                    password: process.env.FTP_PASS,
                })
                await client.uploadFrom(`public/files/${rand}.ogg`, `/${r.branch_code}/ogg/${rand}.ogg`)
                // await client.uploadFrom(blob, `/${r.branch_code}/ogg/${rand}.ogg`)
                client.close()
                await fs.unlink(`public/files/${rand}.ogg`)

                Message.create({
                    user: socket.user_id,
                    room: room._id,
                    is_voice: true,
                    // file_path: `/files/${rand}.ogg`,
                    file_path: `/${r.branch_code}/ogg/${rand}.ogg`,
                    created_at: Date.now(),
                }).then(msg => {
                    message_id = msg._id
                }).catch(e => {
                    console.log(e)
                })
                // socket.to(room.slug).broadcast.emit('voice', blob);
                // adminNS.to(room.slug).emit('voice', blob)
                socket.to(room.slug).emit('voice', {
                    id: message_id,
                    user: socket.user_id,
                    room: room._id,
                    // file_path: `/files/${rand}.ogg`,
                    file_path: `${process.env.HTTP_HOST}/${r.branch_code}/ogg/${rand}.ogg`,
                    is_voice: true,
                    created_at: moment().locale('fa').format('HH:mm:ss YYYY/M/D'),
                    name: socket.name
                })
            } catch (e) {
                console.log(e)
            }
        });
        // socket.on('roomOnlineUsers', (room) => {
        //     try {
        //         const room_users = users.filter(usr => usr.rooms.includes(room))
        //         socket.emit('roomOnlineUsers', room_users)
        //     } catch (e) {
        //         console.log(e)
        //     }
        // })
        socket.on('kickUserFromRoom', ({room, user_id}) => {
            try {
                const index = users.findIndex(t => t.user_id === user_id)
                const user = users[index];
                socket.to(user.socket_id).emit('kickUserFromRoom')
                io.of('/').sockets.get(user.socket_id).leave(room)
                if (user.rooms && user.rooms.length > 1) {
                    user.rooms = user.rooms.filter(r => r !== room)
                } else {
                    users.splice(index, 1)
                }
                io.to(room).emit('deleteRemovedUserElement', {user_id})
            } catch (e) {
                console.log(e)
            }
        })
        socket.on('file', async ({
                                     room_id,
                                     user_id,
                                     file_path,
                                     file_name,
                                     file_ext,
                                     file_title,
                                     file_size,
                                     element_id
                                 }) => {
            try {
                const r = await Room.findById(room_id)
                const client = new ftp.Client(5000)
                await client.access({
                    host: process.env.FTP_HOST,
                    user: process.env.FTP_USER,
                    password: process.env.FTP_PASS,
                })
                await client.ensureDir(`${r.branch_code}/${file_ext}`)
                // client.trackProgress(info => {
                //     console.log(info.bytes)
                // })
                await client.uploadFrom(file_path, `/${r.branch_code}/${file_ext}/${file_title}.${file_ext}`)
                // client.trackProgress()
                client.close()
                await fs.unlink(file_path)
                Message.create({
                    user: socket.user_id,
                    room: r?._id,
                    is_file: true,
                    file_name,
                    file_type: file_ext,
                    file_size,
                    file_path: `/${r?.branch_code}/${file_ext}/${file_title}.${file_ext}`,
                    created_at: Date.now(),
                }).then(msg => {
                    socket.to(r?.slug).emit('file', {
                        id: msg._id,
                        user: socket.user_id,
                        room: r?._id,
                        is_file: true,
                        file_path: `${process.env.HTTP_HOST}/${r.branch_code}/${file_ext}/${file_title}.${file_ext}`,
                        file_type: file_ext,
                        file_name,
                        file_size: msg.file_size,
                        created_at: moment().locale('fa').format('HH:mm:ss YYYY/M/D'),
                        name: socket.name,
                        element_id
                    })
                    socket.emit('file', {
                        is_sender: true,
                        id: msg._id,
                        user: socket.user_id,
                        room: r?._id,
                        is_file: true,
                        file_path: `${process.env.HTTP_HOST}/${r.branch_code}/${file_ext}/${file_title}.${file_ext}`,
                        file_type: file_ext,
                        file_name,
                        file_size: msg.file_size,
                        created_at: moment().locale('fa').format('HH:mm:ss YYYY/M/D'),
                        name: socket.name,
                        element_id
                    })
                }).catch(e => {
                    console.log(e)
                })
            } catch (e) {
                console.log(e)
            }
        })
    })
}
