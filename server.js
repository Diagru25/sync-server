require('dotenv').config();
const express = require('express');
const app = express();
const multer = require('multer');
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const uploadFolderName = process.env.UPLOAD_FOLDER;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage });

app.use(express.static(__dirname + uploadFolderName));

app.get('/download/:filename', (req, res) => {
    try {
        const filePath = __dirname + uploadFolderName + req.params.filename;
        res.sendFile(filePath);

    } catch (error) {
        return res.send({
            success: false
        });
    }
})

app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.send({
                success: false
            });

        } else {
            return res.send({
                success: true,
                link_file: `http://${req.headers.host}${uploadFolderName}${req.file.filename}`,
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
                image_list.push(`http://${req.headers.host}${uploadFolderName}${item.filename}`);
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