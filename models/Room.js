const mongoose = require('mongoose');
const Message = require('../models/Message');

const RoomSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    slug: {
        type: String,
        unique: true
    },
    visibility: {
        type: Boolean
    },
    voice_length_limit: {
        type: Number,
        default: 1
    },
    branch_code: {
        type: String,
    },
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]
}, {
    timestamps: false,
    versionKey: false
});
RoomSchema.post('remove', async (doc) => {
    await Message.deleteMany({room: doc._id})
});
const Room = mongoose.model('Room', RoomSchema);
module.exports = Room;
