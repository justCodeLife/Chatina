const fs = require('fs');
const path = require('path');
const express = require('express');
const app = express();
const serveIndex = require('serve-index')
const mongoose = require("mongoose");
// const server = require('http').createServer(app);
const {protect} = require('./middleware/auth');

const httpsServer = require('https').createServer({
    key: fs.readFileSync('cert/key.pem'),
    cert: fs.readFileSync('cert/cert.pem')
}, app);
require('dotenv').config({path: path.join(__dirname, '.env')});
const io = require('socket.io')(httpsServer, {
    transports: ['websocket'],
    // origins: [`${process.env.DEBUG_MODE === 'true' ? 'http://localhost:' + process.env.PORT : window.location.origin}`]
});
require('./services/socket')(io);
// const formDataParser = require('multer')().none();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const errorHandler = require('./middleware/error');
mongoose.connect('mongodb://localhost/chat', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then().catch(err => console.log(err));
app.set('io', io)
app.use(express.urlencoded({extended: false}));
app.use(express.json());
// app.use(formDataParser);
app.use(cookieParser());
// app.use(cors({credentials: true, origin: 'http://localhost:8080'}));
app.use(cors({
    origin: function (origin, callback) {
        return callback(null, true);
    },
    optionsSuccessStatus: 200,
    credentials: true
}));
// app.use(cors())
app.use('/files', serveIndex('public/files'))
app.use('/', express.static('public'))
//for reverse proxy
// app.set('trust proxy', 'loopback');
//-------------------------------ROUTES------------------------------------
// app.get('/doc', (req, res) => {
//     res.sendFile(__dirname + '/public/doc/doc.html')
// })
app.use('/api', require('./routes/api'));
app.get('/', protect, (req, res) => {
    if (req.user.role === 2) {
        res.sendFile(__dirname + '/public/admin.html')
    } else {
        res.sendFile(__dirname + '/public/user.html')
    }
})
// app.get('/login', (req, res) => {
//     res.sendFile(__dirname + '/public/login.html')
// })
app.all('*', function (req, res) {
    return res.status(404).json('ROUTE NOT FOUND').end();
});
// ----------------------------END ROUTES----------------------------------
app.use(errorHandler);
process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
});
// server.listen(process.env.PORT || 3000);
httpsServer.listen(3000);
