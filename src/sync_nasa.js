import dotenv from "dotenv";
import cron from "node-cron";
import { getDayOfYear } from "../utils/string_helper.js";
import { exec } from "node:child_process";
import axios from "axios";
import fs from "fs";
import path from "path";
import { splitParagraph, sortGpsData } from "../utils/string_helper.js";

dotenv.config();

const nasaFolderName = process.env.NASA_FOLDER;

const syncNasaData = async () => {
  try {
    const day = getDayOfYear();
    const fileName = `brdc${day.padStart(3, "0")}0.${new Date()
      .getUTCFullYear()
      .toString()
      .slice(-2)}n.gz`;

    const urlDownload = `"https://cddis.nasa.gov/archive/gnss/data/daily/${new Date().getUTCFullYear()}/brdc/${fileName}"`;
    const command = `curl -c cookie.txt --netrc-file .netrc -L -o ${nasaFolderName}${fileName} ${urlDownload}`;

    exec(command, { encoding: "utf-8" }, (error, stdout, stderr) => {
      if (error !== null) {
        console.log("Error", error, stderr);

        return;
      }

      //extract
      exec(
        `gzip -d -f ${nasaFolderName}${fileName}`,
        (error, stdout, stderr) => {
          if (error !== null) {
            console.log("Error", error, stderr);

            return;
          }
          console.log("done extract");

          const day = getDayOfYear();
          const nasaFileName = `brdc${day.padStart(3, "0")}0.${new Date()
            .getUTCFullYear()
            .toString()
            .slice(-2)}n`;
          const gpsCombineFileName = `GPS${nasaFileName}`;

          const nasaFileData = fs.readFileSync(
            process.env.NASA_FOLDER + nasaFileName,
            "UTF-8"
          );

          if (
            fs.existsSync(
              path.join(process.env.UPLOAD_FOLDER, gpsCombineFileName)
            )
          ) {
            const nasaParagraph = splitParagraph(nasaFileData);
            nasaParagraph.shift();
            const _nasaParagraph = [];
            for (let i = 0; i < nasaParagraph.length; i += 2) {
              if (nasaParagraph[i] && nasaParagraph[i + 1])
                _nasaParagraph.push(nasaParagraph[i] + nasaParagraph[i + 1]);
            }

            const existCombineFileData = fs.readFileSync(
              process.env.UPLOAD_FOLDER + gpsCombineFileName,
              "UTF-8"
            );

            const existCombineFileParagraph =
              splitParagraph(existCombineFileData);
            const existHeader = existCombineFileParagraph.shift();
            const _existCombineFileParagraph = [];
            for (let i = 0; i < existCombineFileParagraph.length; i += 2) {
              if (
                existCombineFileParagraph[i] &&
                existCombineFileParagraph[i + 1]
              )
                _existCombineFileParagraph.push(
                  existCombineFileParagraph[i] +
                    existCombineFileParagraph[i + 1]
                );
            }
            let mergedData = [
              ...new Set([..._existCombineFileParagraph, ..._nasaParagraph]),
            ];

            const sortedArr = sortGpsData(mergedData);

            //sort
            let final_mergeData = compareTwoData([], sortedArr);

            if (existHeader.includes("HEADER"))
              final_mergeData.unshift(existHeader);

            fs.writeFileSync(
              process.env.UPLOAD_FOLDER + gpsCombineFileName,
              final_mergeData.join("")
            );
          } else {
            fs.writeFileSync(
              process.env.UPLOAD_FOLDER + gpsCombineFileName,
              nasaFileData
            );
          }
        }
      );
    });
  } catch (error) {
    console.log("Error when download brdc file from nasa: ", error);
    return;
  }
};

const syncBeidou = () => {
  try {
    axios
      .get("https://glonass-iac.ru/beidou/ephemeris/beidou_almanac_calc.php", {
        headers: {
          Cookie:
            "PHPSESSID=gJC7OruBE039XyGJDwQCBDVMzCMxniiG; BITRIX_SM_GUEST_ID=10885490; session-cookie=17ad9ba6d696afc3c5e2993b6940ac7285eeac2acafcbbb532d19ff321224111147cca89ce1880ccf32ee36edaa54a21; BITRIX_CONVERSION_CONTEXT_s1=%7B%22ID%22%3A21%2C%22EXPIRE%22%3A1706216340%2C%22UNIQUE%22%3A%5B%22conversion_visit_day%22%5D%7D; BX_USER_ID=a3f8c7b8e68afd6d15694f25ee039175; BITRIX_SM_LAST_VISIT=25.01.2024%2016%3A59%3A06",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      })
      .then((res) => console.log(res.data.length))
      .catch((err) => console.log(err));
  } catch (error) {}
};

const task = cron.schedule("*/5 * * * *", () => {
  syncNasaData();
});

const task_bd = cron.schedule("0 5 * * * *", () => {
  syncBeidou();
});

task.start();
//task_bd.start();
