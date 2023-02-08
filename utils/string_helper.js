import fs from "fs";
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

export const appendAgentFile = (filePath, name, lineData) => {
  try {
    const lines = readFileLineByLine(filePath);

    let isChange = false;
    for (let i = 0; i < lines.length; i++) {
      const paths = lines[i].split(" ");
      const isExisted = paths.includes(name);
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
  const start = new Date(now.getFullYear(), 0, 0);
  const diff =
    now -
    start +
    (start.getTimezoneOffset() - now.getTimezoneOffset()) * 60 * 1000;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return day.toString();
};

export const checkTypeRinex = (filePath) => {
  try {
    const file = fs.readFileSync(filePath, "utf-8");

    //console.log(file);
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
