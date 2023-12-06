import dotenv from "dotenv";
import cron from "node-cron";
import { getDayOfYear } from "../utils/string_helper.js";
import { exec } from "node:child_process";

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
        }
      );
    });
  } catch (error) {
    console.log("Error when download brdc file from nasa: ", error);
    return;
  }
};

const task = cron.schedule("0 5 * * * *", () => {
  syncNasaData();
});

task.start();
