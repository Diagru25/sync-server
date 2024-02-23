import dotenv from "dotenv";
import express from "express";
import multer from "multer";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "./middleware.js";
import {
  appendAgentFile,
  readFileLineByLine,
  splitParagraph,
  getDayOfYear,
  compareTwoData,
} from "../utils/string_helper.js";

//Connect sqlite db
const DB_SOURCE = "db.sqlite";
const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    db.run(
      `CREATE TABLE Users (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            Username text,  
            Password text,             
            Salt text,    
            Token text,
            DateLoggedIn DATE,
            DateCreated DATE
            )`,
      (err) => {
        if (err) {
          // Table already created
        } else {
          const salt = bcrypt.genSaltSync(10);
          var insert =
            "INSERT INTO Users (Username, Password, Salt, DateCreated) VALUES (?,?,?,?)";
          db.run(
            insert,
            ["admin", bcrypt.hashSync("admin", salt), salt, Date("now")],
            (err) => {
              console.log(err);
            }
          );
        }
      }
    );
  }
});

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
      ? `${prefixFileName[0]}brdc${tempFileName}`
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

//apis
app.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!(username && password)) {
      res.status(400).send("All input is required");
    }

    let user = null;

    const sql = `SELECT * FROM Users WHERE Username = "${username}"`;
    db.all(sql, function (err, rows) {
      if (err) {
        res.status(400).json({ error: err.message });
        return;
      }

      if (rows.length > 0) user = rows[0];
      else return res.status(400).send("Tài khoản không tồn tại");

      const PHash = bcrypt.hashSync(password, user.Salt);

      if (PHash === user.Password) {
        // * CREATE JWT TOKEN
        const token = jwt.sign(
          { UserId: user.Id, Username: user.Username },
          process.env.TOKEN_KEY,
          {
            expiresIn: "1h", // 60s = 60 seconds - (60m = 60 minutes, 2h = 2 hours, 2d = 2 days)
          }
        );

        user.Token = token;
      } else {
        return res.status(400).send("Mật khẩu không chính xác");
      }

      return res.status(200).json({ token: user.Token, user });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Lỗi không xác định",
    });
  }
});

app.get("/auth/check_session", verifyToken, (req, res) => {
  res.send({ ...req.user });
});

app.get("/api/agents", (req, res) => {
  try {
    const lines = readFileLineByLine("./assets/agents.txt");
    const data = lines.map((line) => {
      const paths = line.split(" ");
      if (paths.length !== 5) return {};

      const d = new Date(Number(paths[4]));
      const localUpdatedAt = `${d.getDate()}/${
        d.getMonth() + 1
      }/${d.getFullYear()}, ${d.getHours()}:${d.getMinutes()}:${d.getSeconds()}`;

      const url = paths[3].split(["://"])[1];
      const ngrokArr = url.split(":");
      const sshCommand = `ssh ${paths[1] || "username"}@${ngrokArr[0]} -p ${
        ngrokArr[1]
      }`;

      const obj = {
        name: paths[0],
        username: paths[1],
        IP: paths[2],
        publicUrl: paths[3],
        updatedAt: d.toISOString(),
        localUpdatedAt,
        sshCommand,
      };

      return obj;
    });

    return res.send({
      success: true,
      data: [...data],
    });
  } catch (error) {
    console.log("/api/agents: ", error);
    return res.status(500).send({
      message: "Lỗi không xác định",
    });
  }
});

app.post("/api/agents/status", (req, res) => {
  try {
    const data = req.body;
    const agentIp = req.socket.remoteAddress;
    const updatedAt = new Date();
    const lineData = `${data.name || "Unknown-Computer"} ${
      data.username
    } ${agentIp} ${data.publicUrl} ${updatedAt.getTime()}`;

    const isAppend = appendAgentFile("./assets/agents.txt", agentIp, lineData);

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
    const query = req.query;
    const files = fs.readdirSync(__dirname + "/" + uploadFolderName);

    let data = [];

    switch (query.type) {
      case "GPS":
        data = files
          .filter((item) => item.includes("GPS"))
          .map((item) => ({
            filename: item,
            filePath: `http://${req.headers.host}/api/download/${item}`,
          }));
        break;
      case "BEIDOU":
        data = files
          .filter((item) => item.includes("BDS"))
          .map((item) => ({
            filename: item,
            filePath: `http://${req.headers.host}/api/download/${item}`,
          }));
        break;
      case "GLONASS":
        data = files
          .filter((item) => item.includes("GLONASS"))
          .map((item) => ({
            filename: item,
            filePath: `http://${req.headers.host}/api/download/${item}`,
          }));
        break;
      default:
        data = files.map(
          (item) => `http://${req.headers.host}/api/download/${item}`
        );
        break;
      // code block
    }

    return res.send({
      success: true,
      data,
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
        (item) => `http://${req.headers.host}/api/download/${item}?type=nasa`
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
    const query = req.query;
    let folderName = uploadFolderName;

    if (query.type === "nasa") folderName = nasaFolderName;
    const filePath = `${__dirname}/${folderName}/${req.params.filename}`;
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

        //Nếu là file BEIDOU thì lưu luôn
        if (newFilename.includes("BDS") || oldFilename.includes("BDS")) {
          // append data to old file
          fs.writeFileSync(
            process.env.UPLOAD_FOLDER + oldFilename,
            newFileData
          );

          //delete file
          fs.unlinkSync(process.env.UPLOAD_FOLDER + req.file.filename);
        } else {
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
