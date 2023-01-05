import dotenv from 'dotenv'
import chokidar from 'chokidar';
import events from "events";
import fs from "fs";
import axios from 'axios';
import FormData from "form-data";
import { getDayOfYear } from '../utils/string_helper.js';
import path from 'path';
import { REGEX_EXT } from '../utils/constant.js';

dotenv.config()
const watchDir = process.env.WATCH_FOLDER

const uploadFileToServer = async (filePath) => {
    try {
        const file = await fs.readFileSync(filePath);
        const form = new FormData();

        const day = getDayOfYear();
        const filename = `${day.padStart(3, '0')}0.${new Date().getFullYear().toString().slice(-2)}n`;

        form.append('file', file, filename);
        const res = await axios.post(`${process.env.SERVER_URL}/api/upload`, form);
        return res.data;
    }
    catch (error) {
        //console.log("call error: ", error);
        return null;
    }
}

class Watcher extends events.EventEmitter {
    constructor(watchDir) {
        super();
        this.watchDir = watchDir;
    }

    async uploadFile(filePath) {
        try {
            const ext = path.extname(filePath);
            if (ext.match(REGEX_EXT)) {
                const result = await uploadFileToServer(filePath);
                if (result) {
                    console.log(result);
                }
                else {
                    console.log('Upload file thất bại.');
                }
            }
            else {
                console.log(`[WATCHER] Định dạng file không đúng: ${filePath}.`);
                return;
            }
        }
        catch (error) {
            console.log("uploadFile: ", error);
        }
    }

    start() {
        chokidar.watch(watchDir).on('all', (event, path) => {
            switch (event) {
                case "add": this.uploadFile(path);
                case "change": this.uploadFile(path);
                case "unlink": return;
                default: return;
            }
        })
    }
}

let watcher = new Watcher(watchDir);

/*Start it!!!*/

watcher.start();