import dotenv from "dotenv";
import cron from "node-cron";
import axios from "axios";
import os from "os";

dotenv.config();

const sendStatusAgent = async () => {
  try {
    // get ngrok info
    const ResNgrok = await axios.get("http://localhost:4040/api/tunnels");
    const { tunnels } = ResNgrok.data;
    if (tunnels.length === 0) {
      console.log("ngrok is not running!");
      return;
    } else {
      const foundIndex = tunnels.findIndex((el) => el.name === "ssh");
      if (foundIndex !== -1) {
        const { public_url } = tunnels[foundIndex];
        const computerName = os.hostname();
        await axios.post(`${process.env.SERVER_URL}/api/agents/status`, {
          name: computerName,
          publicUrl: public_url,
        });
        return;
      } else {
        console.log("ngrok SSH not open!");
        return;
      }
    }
  } catch (error) {
    console.log("Agent: ", error);
    return;
  }
};

const task = cron.schedule("*/10 * * * * *", () => {
  sendStatusAgent();
});

task.start();
