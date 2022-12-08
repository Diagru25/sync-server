require('dotenv').config();
const chokidar = require('chokidar');
const events = require("events");


const fs = require("fs")
const watchDir = process.env.WATCH_FOLDER

/*Let's extend events.EventEmitter in order to be able
to emit and listen for event*/

const regex = /\d{1,2}\s\d{1,2}\s\d{1,2}\s\s\d{1,1}/
const a = /(\d{1,2}\s\d{2}\s\d{1,2}\s\s\d{1,1})/g
class Watcher extends events.EventEmitter {
    constructor(watchDir) {
        super();
        this.watchDir = watchDir;
    }

    /* Cycles through directory and process any file
    found emitting a process event for each one*/

    watchRename(fileChange) {
        const watcher = this;
        fs.readdir(this.watchDir, function (err, files) {
            if (err) throw err;
            for (let index in files) {
                //watcher.emit("process", { file: files[index], index: Math.random() });
            }
        });
    }

    readFile(filePath) {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                throw err;
            }
            let arrResult = data.split(a);

            if(arrResult.length === 0)
                return;
            
            if (arrResult[0].includes("END OF HEADER")) arrResult.shift();

            let res = []
            for(let i = 0; i < arrResult.length; i+=2)
                res.push(arrResult[i] + arrResult[i + 1])
            
                fs.writeFile('./uploads/a.txt', res.join(""), function (err) {
                    if (err) throw err;
                    console.log('Saved!');
                });
        });
    }

    /* Start the directory monitoring 
    leveraging Node's fs.watchFile */

    start() {
        // var watcher = this;
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

/* Let's instantiate our Watcher object 
passing to the constructor our folders path */

let watcher = new Watcher(watchDir);


watcher.on("processChange", function process(file) {
    const fileChangePath = this.watchDir + "/" + file;
    console.log(fileChangePath);
});

watcher.on("processDelete", function process(file) {
    const fileChangePath = this.watchDir + "/" + file;
    console.log(fileChangePath);
});

watcher.on("processAdd", function process(file) {
    const fileChangePath = this.watchDir + "/" + file;
    console.log(fileChangePath);
});

/*Start it!!!*/

watcher.start();