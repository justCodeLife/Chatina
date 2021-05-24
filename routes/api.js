const router = require('express').Router();
const {protect, authorize} = require('../middleware/auth');
const multer = require('multer')
const {uuid} = require('uuidv4');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/files')
    },
    filename: function (req, file, cb) {
        const rand = uuid()
        const extension = file.originalname.split('.')[file.originalname.split('.').length - 1]
        file.extension = extension
        file.title = rand
        file.name = file.originalname
        cb(null, `${rand}.${extension}`)
    }
})
const formDataParser = multer({storage, limits: {fileSize: 10 * 1024 * 1024}});

//------------------import controllers--------------------------------------
const ChatController = require('../controllers/ChatController');
const RoomController = require('../controllers/RoomController');
const UserController = require('../controllers/UserController');
const AuthController = require('../controllers/AuthController');
//--------------------auth routes-------------------------------------------
router.post('/login', formDataParser.none(), AuthController.login);
router.post('/logout', formDataParser.none(), AuthController.logout);
router.get('/get_logged_in_user', formDataParser.none(), AuthController.getLoggedInUser);
router.post('/init_data', [formDataParser.none(), protect], AuthController.init_data);
//--------------------------------------------------------------------------
//--------------------rooms routes------------------------------------------
router.post('/rooms', [protect, authorize], RoomController.add);
router.delete('/rooms', [protect, authorize], RoomController.delete);
router.put('/rooms', [protect, authorize], RoomController.edit);
router.post('/rooms/users', [protect, authorize], RoomController.room_users);
router.post('/rooms/messages', protect, RoomController.room_messages);
router.post('/rooms/upload_file', [(req, res, next) => {
    formDataParser.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            console.log(err)
            return res.json({error: 'حجم فایل بیش از حد مجاز است'})
        } else if (err) {
            console.log(err)
            return res.json({error: 'ارسال فایل با خطا مواجه شد'})
        }
        next()
    })
}, protect], RoomController.upload_file);
//--------------------------------------------------------------------------
//--------------------users routes------------------------------------------
router.post('/users', [formDataParser.none(), protect, authorize], UserController.add);
router.put('/users', [formDataParser.none(), protect, authorize], UserController.edit);
router.delete('/users', [formDataParser.none(), protect, authorize], UserController.delete);
router.post('/users/rooms', [formDataParser.none(), protect, authorize], UserController.user_rooms);
router.post('/users/add_to_room', [formDataParser.none(), protect, authorize], UserController.add_user_to_room);
router.post('/users/remove_from_room', [formDataParser.none(), protect, authorize], UserController.remove_user_from_room);
//--------------------------------------------------------------------------
//--------------------branches routes---------------------------------------
router.delete('/branches', [formDataParser.none(), protect, authorize], UserController.delete_branch);
router.post('/run_chat', [formDataParser.none(), protect], ChatController.run_chat);
//--------------------------------------------------------------------------
module.exports = router;
