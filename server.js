let express = require('express');
let app = express();
// const cron = require('node-cron');
let multer = require('multer');
const fs = require('fs');
let bodyParser = require('body-parser');
let cors = require('cors');
const mime = require('mime');
let generateSafeId = require('generate-safe-id');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        console.log(file);
        cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage })


app.post('/uploadfile', upload.single('myFile'), (req, res, next) => {
    const file = req.file
    if (!file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }
    res.send(file)
})

app.use(express.static(__dirname + "/uploads"));
app.get('/uploads/:id', (req, res) => {
    try {
        res.sendFile(__dirname + "/uploads/" + req.params.id);
    } catch (error) {
        return res.send({
            success: false
        });
    }
})

app.post('/api/upload', upload.single('file'), (req, res) => {
    console.log("abc")
    try {
        if (!req.file) {
            return res.send({
                success: false
            });

        } else {
            return res.send({
                success: true,
                link_file: `http://${req.headers.host}/uploads/${req.file.filename}`,
            })
        }
    } catch (error) {
        return res.send({
            success: false
        });
    }

});
app.post("/api/upload/multiple", upload.array('files', 5), (req, res) => {
    try {
        if (!req.files) {
            return res.send({
                success: false
            });

        } else {
            let image_list = [];
            for (const item of req.files) {
                image_list.push(`http://${req.headers.host}/uploads/${item.filename}`);
            }
            return res.send({
                success: true,
                image_list
            })
        }
    } catch (error) {
        return res.send({
            success: false
        });
    }
});
app.listen(5000, () => {
    console.log("Server is running at port 5000");
})