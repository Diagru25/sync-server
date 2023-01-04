import dotenv from 'dotenv';
import cron from 'node-cron';
import axios from 'axios';
import os from 'os';

dotenv.config()

const sendStatusAgent = async () => {
    try {
        const computerName = os.hostname();
        await axios.post(`${process.env.SERVER_URL}/api/agents/status`, { name: computerName });
    }
    catch (error) {
        console.log("Agent: ", error);
        return;
    }
}

const task = cron.schedule('*/5 * * * *', () => {
    sendStatusAgent();
});

task.start();