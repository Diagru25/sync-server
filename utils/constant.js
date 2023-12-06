//export const REGEX_SPLIT = /(?=[A-Z]\d{2}\s\d{4}\s\d{2}\s\d{2})/g;
//export const REGEX_SPLIT = /(\d{1,2}\s\d{2}\s\s\d{1,2}\s\d{1,2})/g;
export const REGEX_SPLIT =
  /([^\+00\n]\d{1,2}\s\d{2}[\x20\t]+\d{1,2}[\x20\t]+\d{1,2}[\x20\t]+\d{1,2}[\x20\t]+\d{1,2})/g;
export const REGEX_EXT = /(\.\d{2}n)|(.nav)/g;
