const mongoose = require('mongoose');
const moment = require('jalali-moment');

const MessageSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    room: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Room'
    },
    message: {
        type: String,
    },
    is_voice: {
        type: Boolean
    },
    is_file: {
        type: Boolean
    },
    file_name: {
        type: String,
    },
    file_type: {
        type: String,
    },
    file_size: {
        type: Number,
        get: function (file_size) {
            if (file_size > 1000) {
                return `${(file_size / 1000000).toFixed(2)} MB`
            } else if (file_size > 1000000) {
                return `${(file_size / 1000000000).toFixed(2)} GB`
            } else {
                return `${file_size} B`
            }
        }
    },
    file_path: {
        type: String,
        get: function (file_path) {
            return file_path ? `${process.env.HTTP_HOST}${file_path.startsWith('/') ? file_path : '/' + file_path}` : null;
        }
    },
    created_at: {
        type: Date,
        default: Date.now,
        get: function (created_at) {
            return created_at ? moment(created_at).locale('fa').format('HH:mm:ss YYYY/M/D') : null;
        }
    },
}, {
    timestamps: false,
    toJSON: {getters: true},
    versionKey: false
});
MessageSchema.index({message: 1, created_at: 1});
const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
