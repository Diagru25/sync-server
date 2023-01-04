import dotenv from 'dotenv';
import express from 'express';
import multer from 'multer';
import bodyParser from 'body-parser';
import cors from "cors";
import path from 'path';
import { fileURLToPath } from 'url';
import { appendAgentFile, readFileLineByLine } from '../utils/string_helper.js';


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
        cb(null, uploadFolderName)
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage });

app.use(express.static(__dirname + `/${uploadFolderName}/`));

app.get('/api/agents', (req, res) => {
    try {
        const lines = readFileLineByLine('./assets/agents.txt');
        const data = lines.map((line) => {
            const paths = line.split(' ');
            if(paths.length !== 3) return {

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
                success: false
            })
    }
    catch (error) {
        console.log(error);
        return res.send({
            message: "Lỗi không xác định"
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
        if (!req.file) {
            return res.send({
                success: false
            });

        } else {
            return res.send({
                success: true,
                link_file: `http://${req.headers.host}/api/download/${req.file.filename}`,
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
                image_list.push(`http://${req.headers.host}/download/${item.filename}`);
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
