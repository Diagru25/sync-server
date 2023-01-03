import {REGEX_SPLIT} from "./constant.js";

export const splitParagraph = (s) => {
    console.log("abc");
    if(!s) return [];
    let res = [];
    res = s.split(REGEX_SPLIT);

    return res;

}