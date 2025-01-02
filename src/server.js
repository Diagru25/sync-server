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
  splitParagraph,
  compareTwoData,
  combineMultipleBrdc,
  getLastTwoHour,
  getDayOfYear,
} from "../utils/string_helper.js";
import { FILE_TYPE } from "../utils/constant.js";

//Connect sqlite db
const DB_SOURCE = "db.sqlite";
const db = new sqlite3.Database(DB_SOURCE, (err) => {
  if (err) {
    // Cannot open database
    console.error(err.message);
    throw err;
  } else {
    //create users table
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

    // create agents table
    db.run(
      `CREATE TABLE Agents (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,
            agentId text,  
            name text,             
            username text,
            IP text,    
            publicUrl text,
            sshCommand text,
            note text,
            updatedAt DATE
            )`,
      (err) => {
        if (err) {
          // console.log(err);
          // Table already created
        } else {
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
    // const prefixFileName = file.originalname.split("brdc");

    // const day = getDayOfYear();
    // const tempFileName = `${day.padStart(3, "0")}0.${new Date()
    //   .getUTCFullYear()
    //   .toString()
    //   .slice(-2)}n`;

    // const filename = prefixFileName[0]
    //   ? `${prefixFileName[0]}brdc${tempFileName}`
    //   : tempFileName;

    const filename = file.originalname;

    // nếu đã tồn tại file của ngày đó thì tạo filename mới để xử lý về sau
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

      return res.status(200).json({
        token: user.Token,
        user: {
          ...user,
          Password: "",
          Salt: "",
        },
      });
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({
      message: "Lỗi không xác định",
    });
  }
});

app.put("/user/update/:id", verifyToken, async (req, res) => {
  try {
    const data = req.body;
    const id = req.params.id;

    let sql = `SELECT * FROM Users WHERE Id = ${id}`;
    await db.all(sql, (err, result) => {
      if (err) {
        console.log(err);
        res.status(402).json({ success: false, message: "Error on database" });
        return;
      }

      if (result.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Không tồn tại bản ghi",
        });
      } else {
        const salt = bcrypt.genSaltSync(10);
        const newPass = bcrypt.hashSync(data.newPassword, salt);
        //update pass
        sql = `UPDATE Users 
                  SET Salt = "${salt}",
                  Password = "${newPass}" WHERE Id = ${id}`;

        db.run(sql, function (err, innerResult) {
          if (err) {
            console.log(err);
            res.status(400).json({
              success: false,
              message: "Update Failure on database",
            });
            return;
          } else {
            return res.status(200).json({
              success: true,
              message: "Cập nhật thành công",
              data: {},
            });
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
  }
});

app.get("/auth/check_session", verifyToken, (req, res) => {
  res.send({ ...req.user });
});

app.get("/api/agents", verifyToken, (req, res) => {
  try {
    const sql = `SELECT * FROM Agents`;
    db.all(sql, (err, result) => {
      if (err) {
        res.status(400).json({
          success: false,
          message: "Error on database",
        });
      } else {
        res.status(200).json({
          success: true,
          message: "Lấy danh sách trạm thu thành công",
          data: result,
        });
      }
    });
  } catch (error) {
    console.log("/api/agents: ", error);
    return res.status(500).send({
      message: "Lỗi không xác định",
    });
  }
});

app.post("/api/agents/status", async (req, res) => {
  try {
    const data = req.body;
    const agentIp = req.socket.remoteAddress;
    const url = data.publicUrl.split(["://"])[1];
    const ngrokArr = url.split(":");
    const sshCommand = `ssh ${data.username || "username"}@${ngrokArr[0]} -p ${
      ngrokArr[1]
    }`;

    let sql = `SELECT * FROM Agents WHERE agentId = "${data.agentId}"`;
    await db.all(sql, (err, result) => {
      if (err) {
        console.log(err);
        res.status(402).json({ success: false, message: "Error on database" });
        return;
      }

      if (result.length === 0) {
        let sql =
          "INSERT INTO Agents (agentId, name, username, IP, publicUrl, sshCommand, note, updatedAt) VALUES (?,?,?,?,?,?,?,?)";
        const params = [
          data.agentId,
          data.name,
          data.username,
          agentIp,
          data.publicUrl,
          sshCommand,
          "",
          Date("now"),
        ];
        const agent = db.run(sql, params, function (err, innerResult) {
          if (err) {
            res
              .status(400)
              .json({ success: false, message: "Create Failure on database" });
            return;
          } else {
            return res.status(201).json({
              success: true,
              message: "Tạo mới thành công",
              data: agent,
            });
          }
        });
      } else {
        //update note from webs
        let sql = `UPDATE Agents SET note = "${
          data.note || ""
        }" WHERE agentId = "${data.agentId}"`;

        if (data.isFromAgent)
          //update all and don't update note
          sql = `UPDATE Agents 
                  SET agentId = "${data.agentId}",
                      name = "${data.name}",
                      username = "${data.username}",
                      IP = "${agentIp}",
                      publicUrl = "${data.publicUrl}",
                      sshCommand = "${sshCommand}",
                      updatedAt = "${Date("now")}" WHERE agentId = "${
            data.agentId
          }"`;

        db.run(sql, function (err, innerResult) {
          if (err) {
            console.log(err);
            res
              .status(400)
              .json({ success: false, message: "Update Failure on database" });
            return;
          } else {
            return res.status(200).json({
              success: true,
              message: "Cập nhật thành công",
              data: {},
            });
          }
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.put("/api/agents/status", async (req, res) => {
  try {
    const data = req.body;
    const agentIp = req.socket.remoteAddress;

    let sql = `SELECT * FROM Agents WHERE agentId = "${data.agentId}"`;
    await db.all(sql, (err, result) => {
      if (err) {
        console.log(err);
        res.status(402).json({ success: false, message: "Error on database " });
        return;
      }

      if (result.length === 0) {
        const url = data.publicUrl.split(["://"])[1];
        const ngrokArr = url.split(":");
        const sshCommand = `ssh ${data.username || "username"}@${
          ngrokArr[0]
        } -p ${ngrokArr[1]}`;

        let sql =
          "INSERT INTO Agents (agentId, name, username, IP, publicUrl, sshCommand, note, updatedAt) VALUES (?,?,?,?,?, ?, ?, ?)";
        const params = [
          data.agentId,
          data.name,
          data.username,
          agentIp,
          data.publicUrl,
          sshCommand,
          "",
          Date("now"),
        ];
        const agent = db.run(sql, params, function (err, innerResult) {
          if (err) {
            res
              .status(400)
              .json({ success: false, message: "Error on database" });
            return;
          } else {
            return res.status(201).json({
              success: true,
              data: agent,
            });
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Agent exists",
        });
      }
    });
  } catch (error) {
    console.log(error);
    return res.status(500).send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.get("/api/files", (req, res) => {
  try {
    const query = req.query;
    const files = fs
      .readdirSync(__dirname + "/" + uploadFolderName)
      .sort((a, b) => {
        // Lấy số ngày và năm từ tên file, chỉ dùng "brdc" làm anchor
        const matchA = a.match(/brdc(\d{4})\.(\d{2})n/);
        const matchB = b.match(/brdc(\d{4})\.(\d{2})n/);

        if (!matchA || !matchB) return 0;

        const yearA = parseInt(matchA[2]);
        const yearB = parseInt(matchB[2]);

        const dayA = parseInt(matchA[1]);
        const dayB = parseInt(matchB[1]);

        // So sánh năm trước
        if (yearA !== yearB) {
          return yearA - yearB; // Sắp xếp năm giảm dần (mới nhất lên đầu)
        }

        // Nếu cùng năm thì so sánh ngày
        return dayA - dayB; // Sắp xếp ngày giảm dần
      });

    let data = [];

    switch (query.type) {
      case "GPS":
        data = files
          .filter((item) => item.includes(FILE_TYPE.GPS))
          .map((item) => ({
            filename: item,
            filePath: `https://${req.headers.host}/be/api/download/${item}`,
          }));
        break;
      case "BEIDOU":
        data = files
          .filter((item) => item.includes(FILE_TYPE.BEIDOU))
          .map((item) => ({
            filename: item,
            filePath: `https://${req.headers.host}/be/api/download/${item}`,
          }));
        break;
      case "GLONASS":
        data = files
          .filter((item) => item.includes(FILE_TYPE.GLONASS))
          .map((item) => ({
            filename: item,
            filePath: `https://${req.headers.host}/be/api/download/${item}`,
          }));
        break;
      case "MULTIPLE":
        data = files
          .filter((item) => item.includes(FILE_TYPE.MULTIPLE))
          .map((item) => ({
            filename: item,
            filePath: `https://${req.headers.host}/be/api/download/${item}`,
          }));
        break;
      default:
        data = files.map(
          (item) => `http://${req.headers.host}/api/download/${item}`
        );
        break;
      // code block
    }

    data = data.reverse();
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
  } catch (err) {
    console.log("Err - /api/nasa_files:", err);
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
        const isBDS =
          newFilename.includes(FILE_TYPE.BEIDOU) ||
          oldFilename.includes(FILE_TYPE.BEIDOU);

        //new file
        const newFileData = fs.readFileSync(
          uploadFolderName + newFilename,
          "UTF-8"
        );

        const fileType = isBDS ? FILE_TYPE.BEIDOU : FILE_TYPE.GPS;

        const newParagraph = splitParagraph(newFileData, fileType);

        const firstElement = newParagraph.shift();
        const _newParagraph = [];
        for (let i = 0; i < newParagraph.length; i += 2) {
          if (newParagraph[i] && newParagraph[i + 1])
            _newParagraph.push(newParagraph[i] + newParagraph[i + 1]);
        }

        //old file
        const oldFileData = fs.readFileSync(
          uploadFolderName + oldFilename,
          "UTF-8"
        );
        const oldParagraph = splitParagraph(oldFileData, fileType);

        const firstElementOld = oldParagraph.shift();
        const _oldParagraph = [];
        for (let i = 0; i < oldParagraph.length; i += 2) {
          if (oldParagraph[i] && oldParagraph[i + 1])
            _oldParagraph.push(oldParagraph[i] + oldParagraph[i + 1]);
        }

        // Them 2h cuoi cua ngay hom truoc vao file
        const day = getDayOfYear(1);
        let pastFilename = `${fileType}brdc${day.padStart(3, "0")}0.${new Date()
          .getUTCFullYear()
          .toString()
          .slice(-2)}n`;
        const pastTwoHoursData = getLastTwoHour(pastFilename, fileType);

        let mergedData = [
          ...new Set([...pastTwoHoursData, ..._oldParagraph, ..._newParagraph]),
        ];

        const brdcFileName = req.file.filename.slice(-12);

        //Nếu là file BEIDOU
        if (isBDS) {
          const sortedData = compareTwoData([], mergedData, fileType);
          mergedData = [...sortedData];
        } else {
          //nasa file
          if (fs.existsSync(path.join(process.env.NASA_FOLDER, brdcFileName))) {
            const nasaFileData = fs.readFileSync(
              process.env.NASA_FOLDER + brdcFileName,
              "UTF-8"
            );

            const nasaParagraph = splitParagraph(nasaFileData);
            nasaParagraph.shift();
            const _nasaParagraph = [];
            for (let i = 0; i < nasaParagraph.length; i += 2) {
              if (nasaParagraph[i] && nasaParagraph[i + 1])
                _nasaParagraph.push(nasaParagraph[i] + nasaParagraph[i + 1]);
            }

            const comparedData = compareTwoData(
              _nasaParagraph,
              mergedData,
              fileType
            );
            mergedData = [...comparedData];
          }
        }

        //sort
        let final_mergeData = compareTwoData([], mergedData, fileType);

        // add header
        if (firstElement.includes("HEADER"))
          final_mergeData.unshift(firstElement);

        // append data to old file
        fs.writeFileSync(
          uploadFolderName + oldFilename,
          final_mergeData.join("")
        );

        //delete file
        fs.unlinkSync(uploadFolderName + req.file.filename);

        // tao ra file tong hop cua tat ca cac loai ve tinh
        const combineData = combineMultipleBrdc([
          {
            prefix: FILE_TYPE.GPS,
            filename: brdcFileName,
          },
          {
            prefix: FILE_TYPE.BEIDOU,
            filename: brdcFileName,
          },
        ]);

        if (combineData)
          fs.writeFileSync(
            `${uploadFolderName}MULTIPLE${brdcFileName}`,
            combineData
          );
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

app.get("/api/refactorAllBrdc", (req, res) => {
  try {
    const query = req.query;
    const fileType = query.type || FILE_TYPE.GPS;
    const files = fs.readdirSync(__dirname + "/" + uploadFolderName);
    const _files = files.filter((item) => item.includes(fileType));
    for (let i = 0; i < _files.length; i++) {
      const filename = _files[i];
      if (filename && fs.existsSync(path.join(uploadFolderName, filename))) {
        const fileData = fs.readFileSync(uploadFolderName + filename, "UTF-8");

        const paragraph = splitParagraph(fileData);

        const firstElement = paragraph.shift();
        const _paragraph = [];
        for (let j = 0; j < paragraph.length; j += 2) {
          if (paragraph[j] && paragraph[j + 1])
            _paragraph.push(paragraph[j] + paragraph[j + 1]);
        }

        let mergedData = compareTwoData([], _paragraph, fileType);

        if (firstElement.includes("HEADER")) mergedData.unshift(firstElement);

        // append data to old file
        fs.writeFileSync(uploadFolderName + filename, mergedData.join(""));
      }
    }
    return res.send({
      success: true,
      message: "Chỉnh sửa thành công.",
    });
  } catch (err) {
    console.log("Err - /api/refactorAllBrdc:", err);
    return res.send({
      success: false,
      message: "Lỗi không xác định.",
    });
  }
});

app.listen(5001, () => {
  console.log("Server is running at port 5000");
});
