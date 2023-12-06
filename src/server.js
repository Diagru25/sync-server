import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  appendAgentFile,
  readFileLineByLine,
  splitParagraph,
  getDayOfYear,
  compareTwoData,
} from "../utils/string_helper.js";

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename).replace("/src", "");

app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

const uploadFolderName = process.env.UPLOAD_FOLDER;
const nasaFolderName = process.env.NASA_FOLDER;

var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    return cb(null, uploadFolderName);
  },
  filename: function (req, file, cb) {
    const prefixFileName = file.originalname.split("brdc");

    const day = getDayOfYear();
    const tempFileName = `${day.padStart(3, "0")}0.${new Date()
      .getUTCFullYear()
      .toString()
      .slice(-2)}n`;

    const filename = prefixFileName[0]
      ? `${prefixFileName[0]}brcd${tempFileName}`
      : tempFileName;

    if (fs.existsSync(path.join(uploadFolderName, filename))) {
      const newFileName = Date.now().valueOf() + "_" + filename;
      return cb(null, newFileName);
    } else {
      return cb(null, filename);
    }
  },
});

var upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.originalname.includes("_")) {
      req.fileValidationError = `Tên file "${file.originalname}" không được chứa ký tự đặc biệt!.`;
      return cb(null, false, req.fileValidationError);
    } else if (
      file.mimetype !== "application/octet-stream" &&
      file.mimetype !== "text/plain"
    ) {
      req.fileValidationError = `Định dạng file "${file.originalname}" không đúng!.`;
      return cb(null, false, req.fileValidationError);
    } else {
      return cb(null, true);
    }
  },
});

app.use(express.static(__dirname + `/${uploadFolderName}/`));

app.get("/api/agents", (req, res) => {
  try {
    const lines = readFileLineByLine("./assets/agents.txt");
    const data = lines.map((line) => {
      const paths = line.split(" ");
      if (paths.length !== 4) return {};

      const obj = {
        name: paths[0],
        IP: paths[1],
        publicUrl: paths[2],
        updatedAt: new Date(Number(paths[3])).toISOString(),
      };

      return obj;
    });

    return res.send({
      success: true,
      data: [...data],
    });
  } catch (error) {
    console.log("/api/agents: ", error);
    return res.send({
      message: "Lỗi không xác định",
    });
  }
});

app.post("/api/agents/status", (req, res) => {
  try {
    const data = req.body;
    const agentIp = req.socket.remoteAddress;
    const updatedAt = new Date();
    const lineData = `${data.name || "Unknown-Computer"} ${agentIp} ${
      data.publicUrl
    } ${updatedAt.getTime()}`;

    const isAppend = appendAgentFile(
      "./assets/agents.txt",
      data.name,
      lineData
    );

    if (isAppend)
      return res.send({
        success: true,
      });
    else
      return res.send({
        success: false,
        message: "Không ghi được vào file.",
      });
  } catch (error) {
    console.log(error);
    return res.send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.get("/api/files", (req, res) => {
  try {
    const files = fs.readdirSync(__dirname + "/" + uploadFolderName);

    return res.send({
      success: true,
      data: files.map(
        (item) => `http://${req.headers.host}/api/download/${item}`
      ),
    });
  } catch (error) {
    console.log(error);
    return res.send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.get("/api/nasa_files", (req, res) => {
  try {
    const files = fs.readdirSync(__dirname + "/" + nasaFolderName);

    return res.send({
      success: true,
      data: files.map(
        (item) => `http://${req.headers.host}/api/download/${item}`
      ),
    });
  } catch (error) {
    console.log(error);
    return res.send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.get("/api/download/:filename", (req, res) => {
  try {
    const filePath = `${__dirname}/${uploadFolderName}/${req.params.filename}`;
    res.sendFile(filePath);
  } catch (error) {
    return res.send({
      success: false,
    });
  }
});

app.post("/api/upload", upload.single("file"), (req, res) => {
  try {
    if (req.fileValidationError) {
      return res.send({
        success: false,
        message: req.fileValidationError,
      });
    }

    if (!req.file) {
      return res.send({
        success: false,
        message: "Không tồn tại file.",
      });
    } else {
      const newFilename = req.file.filename;
      const oldFilename = req.file.filename.split("_")[1];

      if (
        oldFilename &&
        fs.existsSync(path.join(uploadFolderName, oldFilename))
      ) {
        //new file
        const newFileData = fs.readFileSync(
          process.env.UPLOAD_FOLDER + newFilename,
          "UTF-8"
        );

        const newParagraph = splitParagraph(newFileData);

        const firstElement = newParagraph.shift();
        const _newParagraph = [];
        for (let i = 0; i < newParagraph.length; i += 2) {
          if (newParagraph[i] && newParagraph[i + 1])
            _newParagraph.push(newParagraph[i] + newParagraph[i + 1]);
        }

        //old file
        const oldFileData = fs.readFileSync(
          process.env.UPLOAD_FOLDER + oldFilename,
          "UTF-8"
        );
        const oldParagraph = splitParagraph(oldFileData);
        const firstElementOld = oldParagraph.shift();
        const _oldParagraph = [];
        for (let i = 0; i < oldParagraph.length; i += 2) {
          if (oldParagraph[i] && oldParagraph[i + 1])
            _oldParagraph.push(oldParagraph[i] + oldParagraph[i + 1]);
        }

        let mergedData = [...new Set([..._oldParagraph, ..._newParagraph])];

        //nasa file
        const day = getDayOfYear();
        const nasaFileName = `brdc${day.padStart(3, "0")}0.${new Date()
          .getUTCFullYear()
          .toString()
          .slice(-2)}n`;

        if (fs.existsSync(path.join(process.env.NASA_FOLDER, nasaFileName))) {
          const nasaFileData = fs.readFileSync(
            process.env.NASA_FOLDER + nasaFileName,
            "UTF-8"
          );

          const nasaParagraph = splitParagraph(nasaFileData);
          nasaParagraph.shift();
          const _nasaParagraph = [];
          for (let i = 0; i < nasaParagraph.length; i += 2) {
            if (nasaParagraph[i] && nasaParagraph[i + 1])
              _nasaParagraph.push(nasaParagraph[i] + nasaParagraph[i + 1]);
          }

          const comparedData = compareTwoData(_nasaParagraph, mergedData);
          mergedData = [...comparedData];
        }

        // add header
        if (firstElement.includes("HEADER")) mergedData.unshift(firstElement);

        // append data to old file
        fs.writeFileSync(
          process.env.UPLOAD_FOLDER + oldFilename,
          mergedData.join("")
        );

        //delete file
        fs.unlinkSync(process.env.UPLOAD_FOLDER + req.file.filename);
      }

      return res.send({
        success: true,
        link_file: `http://${req.headers.host}/api/download/${
          oldFilename ? oldFilename : req.file.filename
        }`,
      });
    }
  } catch (error) {
    console.log("/api/upload: ", error);
    return res.send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.post("/api/upload/multiple", upload.array("files", 5), (req, res) => {
  try {
    if (!req.files) {
      return res.send({
        success: false,
      });
    } else {
      let image_list = [];
      for (const item of req.files) {
        image_list.push(
          `http://${req.headers.host}/api/download/${item.filename}`
        );
      }
      return res.send({
        success: true,
        image_list,
      });
    }
  } catch (error) {
    return res.send({
      success: false,
    });
  }
});

app.listen(5000, () => {
  console.log("Server is running at port 5000");
});
