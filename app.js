const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fsExtra = require('fs-extra');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const passport = require('passport');
const { Strategy: BearerStrategy } = require('passport-http-bearer');


let nextUserId = 1;
let users = [
    {
        id: nextUserId++, 
        fname: 'Sunatullo', 
        lname: 'Gafurov', 
        email: 'me@gmail.com', 
        password: bcrypt.hashSync('1234')
    }
];

let nextFileId = 1
let files = [];

let tokens = new Map();

const app = express();


const uploadsPath = path.resolve(__dirname, 'public');

fsExtra.emptyDirSync(uploadsPath);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cors());
app.use('/static', express.static(uploadsPath));

passport.use(new BearerStrategy((token, callback) => {
    const id = tokens.get(token);

    if (id === undefined) {
        callback(null, false);
        return;
    }

    const user = users.find(i => i.id === id);

    if (user === undefined) {
        callback(null, false);
        return;
    }

    callback(null, user);
}));


const auth = passport.authenticate('bearer', {session: false});


app.post('/api/register', (req, res) => {
    
    let {user} = req.body;
    if (users.some(i => i.email === user.email)) {
        const data = {
            message: 'Email already registered',
            type: "ERROR"
        };
        res.send(data);
        return;
    }
    
    user = {...user, id: nextUserId++, password: bcrypt.hashSync(user.password)};

    const token = uuid.v4();
    tokens.set(token, user.id);

    const data = {
        token,
        user: {
            id: user.id,
            fname: user.fname,
            lname: user.lname
        },
        message: 'Successfully registered',
        type: "SUCCESS"
    };

    res.send(data);

    users = [...users, user];    
});

app.post('/api/login', (req, res) => {
    const {email, password} = req.body;
    const currentUser = users.find(i => i.email === email);

    if (currentUser === undefined) {
        const data = {
            message: 'Email or password is incorrect',
            type: 'ERROR'
        };

        res.send(data);
        return;
    }

    if (!bcrypt.compareSync(password, currentUser.password)) {
        const data = {
            message: 'Email or password is incorrect',
            type: 'ERROR'
        }
        res.send(data);
        return;
    }

    const {id, fname, lname} = currentUser;

    const token = uuid.v4();
    tokens.set(token, id);

    const data = {
        token,
        user: {
            id,
            fname,
            lname
        },
        message: 'Successfully logged in',
        type: 'SUCCESS'
    };

    res.send(data);

});

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, uploadsPath);
    },
    filename(req, file, callback) {
        const ext = path.extname(file.originalname);
        const fileName = uuid.v4();
        callback(null, `${fileName + ext}`);
    }
});

const upload = multer({storage}).single('media');

app.get('/api/files', auth, (req, res) => {
    const {id} = req.user;
    const data = files.filter(o => o.ownerId === id);
    res.send(data);
});

app.post('/api/upload', auth, (req, res) => {    
    
    upload(req, res, err => {
        if (err) {
            res.status(400).send(err);
            return;
        }

        if (req.file === undefined) {
            res.status(400).send();
            return;
        }
        const {filename} = req.file;
        const item = {id: nextFileId++, ownerId: req.user.id, filename};

        files = [item, ...files];

        res.send(item);
    });
});

app.delete('/api/file/:id', auth, (req, res) => {
    const id = parseInt(req.params.id, 10);
    const ownerId = req.user.id;
    const existent = files.find(o => o.ownerId === ownerId && o.id === id)
    files = files.filter(o => o !== existent);
    res.send({message: 'Successfully deleted'});
    
});

app.listen(process.env.PORT || 8000);