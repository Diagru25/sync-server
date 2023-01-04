import dotenv from 'dotenv'
import chokidar from 'chokidar';
import events from "events";
import fs from "fs";
import axios from 'axios';
import FormData from "form-data";

dotenv.config()
const watchDir = process.env.WATCH_FOLDER

import { splitParagraph } from "../utils/string_helper.js";

const callApi = async (filePath) => {
    //console.log(filePath);
    const file = await fs.readFileSync("a.txt");
    const form = new FormData();

    form.append('file', file, 'test.txt');
    const res = await axios.post("http://165.22.96.229:5000/api/upload", form);
    console.log(res.data.link_file);
    return res.data;
}
class Watcher extends events.EventEmitter {
    constructor(watchDir) {
        super();
        this.watchDir = watchDir;
    }

    // watchRename(fileChange) {
    //     const watcher = this;
    //     fs.readdir(this.watchDir, function (err, files) {
    //         if (err) throw err;
    //         for (let index in files) {
    //             //watcher.emit("process", { file: files[index], index: Math.random() });
    //         }
    //     });
    // }

    readFile(filePath) {
        callApi(filePath);

        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                throw err;
            }

            const paragraph = splitParagraph(data);
            //console.log(paragraph);

            fs.writeFile('./uploads/a.txt', paragraph.join(""), function (err) {
                if (err) throw err;
                console.log('Saved!');
            });


            // //const fileStream = fs.createReadStream(filePath);
            // //console.log(fileStream);
            // const buffer = fs.readFileSync(filePath);
            // //console.log(buffer);
            // // const fileName = 'test.txt';
            // const formData = new FormData();

            // formData.append('file', buffer);
            // const headers = {
            //     ...formData.getHeaders(),
            //     'Content-Length': formData.getLengthSync(),
            //     'Content-Type': 'multipart/form-data',
            // };

            // axios.post("http://165.22.96.229:5000/api/upload", formData, {headers}).then(res => console.log(res)).catch(res => console.log(res))
            // //axios.get("http://165.22.96.229:5000/download/u.txt").then(res => console.log(res.data)).catch(err => console.log(err));
        });
    }

    start() {
        chokidar.watch(watchDir).on('all', (event, path) => {
            switch (event) {
                case "add": this.readFile(path);
                case "change": return;
                case "unlink": return;
                default: return;
            }
        })
    }
}

let watcher = new Watcher(watchDir);

/*Start it!!!*/

watcher.start();