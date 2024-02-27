import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyToken = (req, res, next) => {
  try {
    let token =
      req.body.token ||
      req.query.token ||
      req.headers["x-access-token"] ||
      req.headers["authorization"];
    if (!token) {
      return res.status(403).send("A token is required for authentication");
    }

    token = token.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.TOKEN_KEY);
      req.user = decoded;
    } catch (err) {
      // console.log(err);
      return res.status(401).send("Token is required");
    }
  } catch (err) {
    // console.log(err);
    return res.status(403).send("Token is required");
  }
  return next();
};
