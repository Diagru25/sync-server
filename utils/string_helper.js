import fs from "fs";
import path from "path";
import { REGEX_SPLIT } from "./constant.js";

export const splitParagraph = (s) => {
  if (!s) return [];
  let res = [];
  res = s.split(REGEX_SPLIT);

  return res;
};

//mode = 0 => remove all empty string line
//mode = 1 => keep all line in file
export const readFileLineByLine = (filePath, mode = 0) => {
  try {
    const data = fs.readFileSync(filePath, "UTF-8");
    let lines = [];

    if (mode === 0) {
      const arr_not_empty_str = data.split(/\r?\n/).filter((el) => el);
      lines = [...arr_not_empty_str];
    } else {
      const arr_keep_empty_str = data.split(/\r?\n/);
      lines = [...arr_keep_empty_str];
    }

    return lines;
  } catch (error) {
    console.log("readFileLineByLine: ", error);
    return [];
  }
};

export const appendAgentFile = (filePath, ip, lineData) => {
  try {
    const lines = readFileLineByLine(filePath);

    let isChange = false;
    for (let i = 0; i < lines.length; i++) {
      const paths = lines[i].split(" ");
      const isExisted = paths.includes(ip);
      if (isExisted) {
        lines[i] = lineData;
        isChange = true;
      }
    }

    if (!isChange) {
      lines.push(lineData);
    }

    //write file
    const file = fs.createWriteStream(filePath);
    file.on("error", (error) => {
      console.log("Open file error: ", error);
      return false;
    });
    lines.forEach((line) => file.write(line + "\n"));
    file.end();

    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
};

export const getDayOfYear = () => {
  const now = new Date();
  const now_utc = new Date(now.toUTCString().slice(0, -4));
  const start = new Date(now_utc.getUTCFullYear(), 0, 0);
  const diff =
    now_utc -
    start +
    (start.getTimezoneOffset() - now_utc.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day.toString();
};

export const checkTypeRinex = (filePath) => {
  try {
    const file = fs.readFileSync(filePath, "utf-8");

    const firstLine = file.split(/\r?\n/)[0];

    if (
      firstLine.includes("C:") ||
      firstLine.includes("BeiDou") ||
      firstLine.includes("BDS")
    )
      return "BDS";

    if (firstLine.includes("G:") || firstLine.includes("GPS")) return "GPS";

    return "";
  } catch (error) {
    return "";
  }
};

export const sortGpsData = (arr) => {
  try {
    const sortedArr = arr.sort((a, b) => {
      const strOneTime = a.match(REGEX_SPLIT)[0];
      const strTwoTime = b.match(REGEX_SPLIT)[0];

      const oneArr = strOneTime
        .split(" ")
        .filter((el) => el)
        .slice(1);

      const twoArr = strTwoTime
        .split(" ")
        .filter((el) => el)
        .slice(1);

      const timeStampOne = new Date(
        Number(`20${oneArr[0]}`),
        Number(oneArr[1]) - 1,
        Number(oneArr[2]),
        Number(oneArr[3]),
        Number(oneArr[4]),
        0
      ).getTime();

      const timeStampTwo = new Date(
        Number(`20${twoArr[0]}`),
        Number(twoArr[1]) - 1,
        Number(twoArr[2]),
        Number(twoArr[3]),
        Number(twoArr[4]),
        0
      ).getTime();
      return timeStampOne - timeStampTwo;
    });

    return sortedArr;
  } catch (err) {
    console.log("Err - sortGpsData: ", err);
    return arr;
  }
};

export const compareTwoData = (nasaData, ownData) => {
  // const defaultArr = nasaData.filter(
  //   (el) =>
  //     !ownData.find((ownEl) => {
  //       el.split(REGEX_SPLIT)[0] === ownEl.split(REGEX_SPLIT)[0];
  //     })
  // );
  //const allArr = defaultArr.concat(ownData);
  const allArr = [...new Set([...nasaData, ...ownData])];
  const sortedArr = sortGpsData(allArr);

  return sortedArr;
};

export const combineMultipleBrdc = (filePaths) => {
  let contents = [];
  try {
    for (let i = 0; i < filePaths.length; i++) {
      if (
        fs.existsSync(
          path.join(
            process.env.UPLOAD_FOLDER,
            `${filePaths[i].prefix}${filePaths[i].filename}`
          )
        )
      ) {
        const fileData = fs.readFileSync(
          `${process.env.UPLOAD_FOLDER}${filePaths[i].prefix}${filePaths[i].filename}`,
          "utf-8"
        );
        contents = [
          ...contents.concat([`START_${filePaths[i].prefix}\n`, fileData]),
        ];
      }
    }
    return contents.join("");
  } catch (err) {
    console.log("combineMultipleBrdc: ", err);
    return "";
  }
};
