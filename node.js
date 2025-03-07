const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;
const mongoose = require("mongoose");
const axios = require("axios");
const cron = require("node-cron");

// MongoDB connection URL
const MONGO_URL = "mongodb://localhost:27017/slack-leave-management";

mongoose
  .connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Error connecting to MongoDB:", err));

const leaveSchema = new mongoose.Schema({
  user: String,
  dates: { type: [Date], required: true },
  reason: String,
  status: { type: String, default: "Pending" },
  leaveType: { type: String, required: true },
  leaveDay: { type: [String], required: true },
  leaveTime: { type: [String], required: true },
});

// Define the User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  slackId: { type: String, required: true },
  sickLeave: { type: Number, default: 0 },
  restrictedHoliday: { type: Number, default: 0 },
  burnout: { type: Number, default: 0 },
  mensuralLeaves: { type: Number, default: 0 },
  casualLeave: { type: Number, default: 0 },
  maternityLeave: { type: Number, default: 0 },
  unpaidLeave: { type: Number, default: 0 },
  paternityLeave: { type: Number, default: 0 },
  bereavementLeave: { type: Number, default: 0 },
  wfhLeave: { type: Number, default: 0 },
  internshipLeave: { type: Number, default: 0 },
});

// Create the Leave and User models
const Leave = mongoose.model("Leave", leaveSchema);
const User = mongoose.model("User", userSchema);

app.use(express.json());

app.get("/leaves", async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const leaves = await Leave.find({
      dates: { $gte: today, $lte: nextWeek },
      status: "Approved",
    })
      .select("user dates reason status leaveType leaveDay leaveTime")
      .exec();

    if (leaves.length === 0) {
      return res.status(404).json({
        message: "No approved leaves found",
        details:
          "There are currently no approved leave records in the database for the next 7 days",
      });
    }

    const formattedLeaves = await Promise.all(
      leaves.map(async (leave) => {
        const user = await User.findOne({ slackId: leave.user }).exec();
        return {
          ...leave._doc,
          user: user ? user.username : leave.user,
          dates: leave.dates.map((date) => date.toISOString()),
        };
      })
    );

    res.status(200).json(formattedLeaves);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching leaves", error: error.message });
  }
});

async function sendSlackNotification(leaves) {
  const blocks = await Promise.all(
    leaves.map(async (leave) => {
      const user = await User.findOne({ slackId: leave.user }).exec();
      const username = user ? user.username : leave.user;
      let text;
      if (
        [
          "Burnout_Leave",
          "Bereavement_Leave",
          "Maternity_Leave",
          "Paternity_Leave",
          "Compensatory_Leave",
          "Work_from_Home",
        ].includes(leave.leaveType)
      ) {
        const fromDate = new Date(leave.dates[0]);
        const toDate = new Date(leave.dates[leave.dates.length - 1]);
        text = `*${username}*:\n From date: ${fromDate.getDate()} ${fromDate
          .toLocaleString("default", { month: "short" })
          .toLowerCase()} \n To date: ${toDate.getDate()} ${toDate
          .toLocaleString("default", { month: "short" })
          .toLowerCase()}`;
      } else {
        text = `*${username}*:\n${leave.dates
          .map((date, index) => {
            const formattedDate = new Date(date);
            return `${formattedDate.getDate()} ${formattedDate
              .toLocaleString("default", { month: "short" })
              .toLowerCase()} (${leave.leaveDay[index]})`;
          })
          .join("\n")}`;
      }
      return {
        type: "section",
        text: {
          type: "mrkdwn",
          text: text,
        },
      };
    })
  );

  try {
    console.log(blocks);

    await axios.post(
      "https://hooks.slack.com/services/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",
      { blocks }
    );
    console.log("Slack notification sent.");
  } catch (error) {
    console.error("Error sending Slack message:", error.message);
  }
}

// Schedule a cron job to run every Monday and Friday at 9:00 AM
cron.schedule("* * * * *", async () => {
  console.log("Running scheduled task to send Slack notifications...");
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const leaves = await Leave.find({
    dates: { $gte: today, $lte: nextWeek },
    status: "Approved",
  })
    .select("user dates reason status leaveType leaveDay leaveTime")
    .exec();

  if (leaves.length > 0) {
    const formattedLeaves = await Promise.all(
      leaves.map(async (leave) => {
        const user = await User.findOne({ slackId: leave.user }).exec();
        return {
          ...leave._doc,
          user: user ? user.username : leave.user,
          dates: leave.dates.map((date) => date.toISOString()),
        };
      })
    );
    sendSlackNotification(formattedLeaves);
  } else {
    console.log("No approved leaves found for the next 7 days.");
  }
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
