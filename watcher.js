require('dotenv').config();
const chokidar = require('chokidar');
const events = require("events");


const fs = require("fs")
const watchDir = process.env.WATCH_FOLDER

/*Let's extend events.EventEmitter in order to be able
to emit and listen for event*/

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

    /* Start the directory monitoring 
    leveraging Node's fs.watchFile */

    start() {
        var watcher = this;
        chokidar.watch(watchDir).on('all', (event, path) => {
            console.log(event, path);
            switch(event) {
                case "add": path;
                case "change": path;
                case "unlink": path;
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