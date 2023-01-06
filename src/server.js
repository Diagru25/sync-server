import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import cors from "cors";
import path from 'path';
import fs from "fs";
import { fileURLToPath } from 'url';
import { appendAgentFile, readFileLineByLine, splitParagraph, getDayOfYear } from '../utils/string_helper.js';


dotenv.config()
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename).replace('/src', '');

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const uploadFolderName = process.env.UPLOAD_FOLDER;

var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        return cb(null, uploadFolderName)
    },
    filename: function (req, file, cb) {
        const day = getDayOfYear();
        const filename = `${day.padStart(3, '0')}0.${new Date().getFullYear().toString().slice(-2)}n`;

        if (fs.existsSync(path.join(uploadFolderName, filename))) {
            const newFileName = Date.now().valueOf() + '_' + filename;
            return cb(null, newFileName);
        } else {
            return cb(null, filename)
        }
    },

})

var upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.originalname.includes('_')) {
            req.fileValidationError = `Tên file "${file.originalname}" không được chứa ký tự đặc biệt!.`;
            return cb(null, false, req.fileValidationError);
        }
        else if (file.mimetype !== "application/octet-stream" && file.mimetype !== "text/plain") {

            req.fileValidationError = `Định dạng file "${file.originalname}" không đúng!.`;
            return cb(null, false, req.fileValidationError);
        }
        else {
            return cb(null, true);
        }

    }
});

app.use(express.static(__dirname + `/${uploadFolderName}/`));

app.get('/api/agents', (req, res) => {
    try {
        const lines = readFileLineByLine('./assets/agents.txt');
        const data = lines.map((line) => {
            const paths = line.split(' ');
            if (paths.length !== 3) return {

            }

            const obj = {
                name: paths[0],
                IP: paths[1],
                updatedAt: new Date(Number(paths[2])).toISOString()
            }

            return obj;
        });

        return res.send({
            success: true,
            data: [...data]
        })
    }
    catch (error) {
        console.log("/api/agents: ", error)
        return res.send({
            message: "Lỗi không xác định"
        })
    }
})

app.post('/api/agents/status', (req, res) => {
    try {
        const data = req.body;
        const agentIp = req.socket.remoteAddress;
        const updatedAt = new Date();
        const lineData = `${data.name || 'Unknown-Computer'} ${agentIp} ${updatedAt.getTime()}`;

        const isAppend = appendAgentFile('./assets/agents.txt', data.name, lineData);

        if (isAppend)
            return res.send({
                success: true,
            })
        else
            return res.send({
                success: false,
                message: "Không ghi được vào file."
            })
    }
    catch (error) {
        console.log(error);
        return res.send({
            success: false,
            message: "Lỗi không xác định."
        })
    }
})

app.get('/api/files', (req, res) => {
    try {
        const files = fs.readdirSync(__dirname + '/' + uploadFolderName);
        
        return res.send({
            success: true,
            data: files
        })
    }
    catch(error) {
        console.log(error);
        return res.send({
            success: false,
            message: "Lỗi không xác định."
        })
    }
})

app.get('/api/download/:filename', (req, res) => {
    try {
        const filePath = `${__dirname}/${uploadFolderName}/${req.params.filename}`;
        res.sendFile(filePath);

    } catch (error) {
        return res.send({
            success: false
        });
    }
})

app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (req.fileValidationError) {
            return res.send({
                success: false,
                message: req.fileValidationError
            });
        }

        if (!req.file) {
            return res.send({
                success: false,
                message: "Không tồn tại file."
            });

        } else {
            const newFilename = req.file.filename;
            const oldFilename = req.file.filename.split("_")[1];

            if (oldFilename && fs.existsSync(path.join(uploadFolderName, oldFilename))) {
                const newFileData = fs.readFileSync(process.env.UPLOAD_FOLDER + newFilename, 'UTF-8');
                const newParagraph = splitParagraph(newFileData);
                const oldFileData = fs.readFileSync(process.env.UPLOAD_FOLDER + oldFilename, 'UTF-8');
                const oldParagraph = splitParagraph(oldFileData);

                const firstElement = newParagraph.shift();

                const mergedData = [...new Set([...oldParagraph, ...newParagraph])];

                if (firstElement.split('\n').length === 10) mergedData[0] = firstElement;

                // append data to old file
                fs.writeFileSync(process.env.UPLOAD_FOLDER + oldFilename, mergedData.join(""));

                //delete file
                fs.unlinkSync(process.env.UPLOAD_FOLDER + req.file.filename);
            }


            return res.send({
                success: true,
                link_file: `http://${req.headers.host}/api/download/${oldFilename ? oldFilename : req.file.filename}`,
            })
        }
    } catch (error) {
        console.log("/api/upload: ", error);
        return res.send({
            success: false,
            message: "Lỗi không xác định."
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
                image_list.push(`http://${req.headers.host}/api/download/${item.filename}`);
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
