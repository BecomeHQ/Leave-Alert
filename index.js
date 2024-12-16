require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");

const RAZORPAY_API_URL = process.env.RAZORPAY_API_URL;
const RAZORPAY_AUTH = {
  id: process.env.RAZORPAY_AUTH_ID,
  key: process.env.RAZORPAY_AUTH_KEY,
};

const EMAILS = [
  "afridha@become.team",
  "aleesha@become.team",
  "arun@become.team",
  "harish@become.team",
  "arjun@become.team",
  "ink@become.team",
  "juhi@become.team",
  "pooja@become.team",
  "preksha@become.team",
  "rahul@become.team",
  "sam@become.team",
  "sid@become.team",
  "vasanth@become.team",
  "vignesh@become.team",
  "shri@become.team",
  "arun.t@become.team",
  "samuel@become.team",
  "noothan@become.team",
  "chandru@become.team",
  "tarun@become.team",
];

const EMAIL_MAP = {
  "afridha@become.team": "Afridha",
  "aleesha@become.team": "Aleesha",
  "arun@become.team": "Sandeep",
  "harish@become.team": "Harish",
  "arjun@become.team": "Arjun",
  "ink@become.team": "Indu",
  "juhi@become.team": "Juhi",
  "pooja@become.team": "Pooja",
  "preksha@become.team": "Preksha",
  "rahul@become.team": "Rahul",
  "sam@become.team": "Samshritha",
  "sid@become.team": "Sid",
  "vasanth@become.team": "Vasanth",
  "vignesh@become.team": "AV",
  "shri@become.team": "Shri",
  "arun.t@become.team": "Arun",
  "samuel@become.team": "Samuel",
  "noothan@become.team": "Noothan",
  "chandru@become.team": "Chandru",
  "tarun@become.team": "Tarun",
};

const getCurrentDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const processAttendanceAndAnnounce = async () => {
  const currentDate = getCurrentDate();
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*On Leave 🏖️*",
      },
    },
  ];
  let isOnLeave = false;
  for (const email of EMAILS) {
    try {
      const razorpayResponse = await fetch(RAZORPAY_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth: RAZORPAY_AUTH,
          request: {
            type: "attendance",
            "sub-type": "fetch",
          },
          data: {
            email,
            "employee-type": "employee",
            date: currentDate,
          },
        }),
      });

      const { data } = await razorpayResponse.json();

      if (data && data.status.description == "leave") {
        const message = `Attendance fetched for ${EMAIL_MAP[email]}:
          Date: ${currentDate}
          Status: ${JSON.stringify(data.status.description) || "Unknown"}`;
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${EMAIL_MAP[email]}*`,
          },
        });
        isOnLeave = true;
        console.log(message);
      }
    } catch (emailError) {
      console.error(`Error processing email ${email}:`, emailError.message);
    }
  }
  if (isOnLeave) {
    try {
      console.log("Sending Slack message...");

      await axios.post(process.env.SLACK_API_URL, {
        blocks: blocks,
      });
    } catch (error) {
      console.error("Error sending Slack message:", error.message);
    }
  }

  console.log("Attendance processing completed.");
};

cron.schedule("0 9 * * *", () => {
  processAttendanceAndAnnounce();
});
