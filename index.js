require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");

const RAZORPAY_API_URL = process.env.RAZORPAY_API_URL;
const RAZORPAY_AUTH = {
  id: process.env.RAZORPAY_AUTH_ID,
  key: process.env.RAZORPAY_AUTH_KEY,
};

const EMAILS = [
  "aleesha@become.team",
  "harish@become.team",
  "afridha@become.team",
  "arun@become.team",
  "arjun@become.team",
  "ink@become.team",
  "juhi@become.team",
  "pooja@become.team",
  "preksha@become.team",
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

const getNextWeekDates = () => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, "0");
    const day = String(nextDate.getDate()).padStart(2, "0");

    dates.push({
      fullDate: `${year}-${month}-${day}`,
      formatted: `${day} ${nextDate.toLocaleString("default", {
        month: "short",
      })}, ${nextDate.toLocaleDateString("en-US", { weekday: "short" })}`,
    });
  }
  return dates;
};

const processWeeklyLeaveAndAnnounce = async () => {
  const nextWeekDates = getNextWeekDates();
  const leaveData = {};

  for (const email of EMAILS) {
    console.log(`Processing leave for ${email}...`);
    for (const date of nextWeekDates) {
      console.log(`Processing leave for ${date.fullDate}...`);
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
              date: date.fullDate,
            },
          }),
        });

        const { data } = await razorpayResponse.json();
        console.log(data, date.fullDate, email);
        if (
          data &&
          (data.status.description == "leave" ||
            data.status.description == "half-day")
        ) {
          if (!leaveData[email]) {
            leaveData[email] = [];
          }
          const leaveDescription =
            data.status.description === "half-day" ? "Half-Day" : "";
          leaveData[email].push({
            ...date,
            description: leaveDescription,
          });
        }
      } catch (error) {
        console.error(
          `Error processing leave for ${email} on ${date.fullDate}:`,
          error.message
        );
      }
    }
  }

  const msg = `*${Object.keys(leaveData).length} ${
    Object.keys(leaveData).length === 1 ? "Person" : "People"
  } are on leave this week*`;

  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: msg,
      },
    },
  ];

  for (const email in leaveData) {
    const user = EMAIL_MAP[email];
    const dates = leaveData[email];
    console.log(JSON.stringify(leaveData));

    if (dates.length === 1) {
      const description = dates[0].description;
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${user}*: ${dates[0].formatted}, ${description}`,
        },
      });
    } else {
      const startDate = dates[0].formatted;
      const endDate = dates[dates.length - 1].formatted;
      const description = dates[0].description;

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${user}*: ${startDate} - ${endDate}, ${description}`,
        },
      });
    }
  }

  if (Object.keys(leaveData).length > 0) {
    try {
      console.log("Sending Slack message...", blocks);

      // await axios.post(process.env.SLACK_API_URL, {
      //   blocks: blocks,
      // });
    } catch (error) {
      console.error("Error sending Slack message:", error.message);
    }
  } else {
    console.log("No one is on leave next week.");
  }

  console.log("Weekly leave processing completed.");
};

// cron.schedule("0 9 * * 5", () => {
// cron.schedule("0 9 * * 1,5", () => {
processWeeklyLeaveAndAnnounce();
// });
