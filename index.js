require("dotenv").config();
const axios = require("axios");
const cron = require("node-cron");
const mongoose = require("mongoose");

mongoose.connect("mongodb://localhost:27017/slack-leave-management", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const leaveSchema = new mongoose.Schema({
  user: String,
  dates: { type: [Date], required: true },
  reason: String,
  status: { type: String, default: "Pending" },
  leaveType: { type: String, required: true },
  leaveDay: { type: [String], required: true },
  leaveTime: { type: [String], required: true },
});
const Leave = mongoose.model("Leave", leaveSchema);

const SLACK_IDS = [
  "U047XMXC003", // Aleesha
  "UB05U84LX", // Harish
  "U05E5KBAT26", // Afridha
  "U05UDFQ1Z7A", // Arun
  "U07G1Q5A1KR", // Arjun
  "US2CSJ89Y", // Indu
  "U05F5TWC59B", // Juhi
  "U02MCTN385A", // Pooja
  "U022F2W0HHP", // Preksha
  "U0145T9FDH8", // Sam
  "U0146408Y2X", // Sid
  "U05DT5SQ0BS", // Vasanth
  "U017GUD4WAU", // Vignesh
  "U05V8CF40AV", // Shri
  "U07F37E4S12", // Arun T
  "U01CN2WA1T2", // Samuel
  "U05V8CGNQ65", // Noothan
  "U071PMXGXRA", // Chandru
  "U06SU8PPADN", // Tarun
  "U06CGR4RPGV", // Gautham
  "U06S83SJJUU", // Divya
  "U086YFDFK9V", // Sree
];

const SLACK_MAP = {
  U047XMXC003: "Aleesha",
  UB05U84LX: "Harish",
  U05E5KBAT26: "Afridha",
  U05UDFQ1Z7A: "Arun",
  U07G1Q5A1KR: "Arjun",
  US2CSJ89Y: "Indu",
  U05F5TWC59B: "Juhi",
  U02MCTN385A: "Pooja",
  U022F2W0HHP: "Preksha",
  U0145T9FDH8: "Sam",
  U0146408Y2X: "Sid",
  U05DT5SQ0BS: "Vasanth",
  U017GUD4WAU: "Vignesh",
  U05V8CF40AV: "Shri",
  U07F37E4S12: "Arun T",
  U01CN2WA1T2: "Samuel",
  U05V8CGNQ65: "Noothan",
  U071PMXGXRA: "Chandru",
  U06SU8PPADN: "Tarun",
  U06CGR4RPGV: "Gautham",
  U06S83SJJUU: "Divya",
  U086YFDFK9V: "Sree",
};

function getNextWeekDates() {
  const today = new Date();
  const nextWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 7
  );
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const nextDate = new Date(
      nextWeek.getFullYear(),
      nextWeek.getMonth(),
      nextWeek.getDate() + i
    );
    dates.push({
      fullDate: nextDate.toISOString().substring(0, 10),
      formatted: `${nextDate.getDate()} ${nextDate.toLocaleString("default", {
        month: "short",
      })}, ${nextDate.toLocaleDateString("en-US", { weekday: "short" })}`,
    });
  }
  return dates;
}

const processWeeklyLeaveAndAnnounce = async () => {
  const nextWeekDates = getNextWeekDates();
  const leaveData = {};

  for (const slackId of SLACK_IDS) {
    console.log(`Processing leave for ${SLACK_MAP[slackId]}...`);
    const leaves = await Leave.find({
      user: slackId,
      dates: { $in: nextWeekDates.map((d) => d.fullDate) },
    });

    for (const leave of leaves) {
      console.log(`Processing leave for ${leave.dates}...`);
      if (!leaveData[slackId]) {
        leaveData[slackId] = [];
      }
      const description = leave.leaveDay;
      leaveData[slackId].push({
        dates: leave.dates.map((date) => ({
          fullDate: date.toISOString().substring(0, 10),
          formatted: `${date.getDate()} ${date.toLocaleString("default", {
            month: "short",
          })}, ${date.toLocaleDateString("en-US", { weekday: "short" })}`,
        })),
        description: description,
      });
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

  for (const slackId in leaveData) {
    const user = SLACK_MAP[slackId];
    const dates = leaveData[slackId];
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
  console.log("Sending Slack message...", blocks);
  if (Object.keys(leaveData).length > 0) {
    try {
      console.log("Sending Slack message...", blocks);

      await axios.post(process.env.SLACK_API_URL, {
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "This is a test message to ensure the Slack integration is working correctly.",
            },
          },
        ],
      });
    } catch (error) {
      console.error("Error sending Slack message:", error);
    }
  } else {
    console.log("No one is on leave next week.");
  }

  console.log("Weekly leave processing completed.");
};

processWeeklyLeaveAndAnnounce()
  .then(() => {})
  .catch((error) => {
    console.error(error);
  });
cron.schedule("0 9 * * 1,5", () => {});
