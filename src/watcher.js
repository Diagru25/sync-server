import dotenv from "dotenv";
import chokidar from "chokidar";
import events from "events";
import fs from "fs";
import axios from "axios";
import FormData from "form-data";
import { getDayOfYear, checkTypeRinex } from "../utils/string_helper.js";
import path from "path";
import { REGEX_EXT } from "../utils/constant.js";

dotenv.config();
const watchDir = process.env.WATCH_FOLDER;

const uploadFileToServer = async (filePath) => {
  try {
    const file = fs.readFileSync(filePath);
    const form = new FormData();

    const typeRinex = checkTypeRinex(filePath);

    if (!typeRinex) {
      console.log("Khong xac dinh duoc loai Rinex");
      return false;
    }

    const day = getDayOfYear();
    let filename = `${day.padStart(3, "0")}0.${new Date()
      .getUTCFullYear()
      .toString()
      .slice(-2)}n`;
    filename = typeRinex ? `${typeRinex}brdc${filename}` : filename;

    form.append("file", file, filename);
    const res = await axios.post(`${process.env.SERVER_URL}/api/upload`, form);
    return res.data;
    //console.log(typeRinex, filename);
    //return true;
  } catch (error) {
    console.log("call error: ", error);
    return false;
  }
};

class Watcher extends events.EventEmitter {
  constructor(watchDir) {
    super();
    this.watchDir = watchDir;
  }

  async uploadFile(filePath) {
    try {
      console.log("file path: ", filePath);
      const ext = path.extname(filePath);
      if (ext.toLowerCase().match(REGEX_EXT)) {
        const result = await uploadFileToServer(filePath);
        if (result) {
          console.log(result);
        } else {
          console.log("Upload file thất bại.");
        }
      } else {
        console.log(`[WATCHER] Định dạng file không đúng: ${filePath}`);
        return;
      }
    } catch (error) {
      console.log("uploadFile: ", error);
    }
  }

  start() {
    chokidar
      .watch(watchDir, {
        ignored: /\.[dat]/,
        persistent: true,
      })
      .on("all", (event, path) => {
        switch (event) {
          case "add":
            this.uploadFile(path);
          case "change":
            this.uploadFile(path);
          case "unlink":
            return;
          default:
            return;
        }
      });
  }
}

let watcher = new Watcher(watchDir);

/*Start it!!!*/

watcher.start();
