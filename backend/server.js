require("dotenv/config");

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const votingWindowsRoutes = require("./routes/votingWindows.routes");
const participantsRoutes = require("./routes/participants.routes");
const ratingsRoutes = require("./routes/ratings.routes");
const labelsRoutes = require("./routes/labels.routes");
const labelStarLevelsRoutes = require("./routes/labelStarLevels.routes");
const ratingLabelsRoutes = require("./routes/ratingLabels.routes");
const auditLogsRoutes = require("./routes/auditLogs.routes");
const suspiciousActivitiesRoutes = require("./routes/suspiciousActivities.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const exportRoutes = require("./routes/export.routes");
const usersRoutes = require("./routes/users.routes");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use("/api/auth", authRoutes);
app.use("/api/voting-windows", votingWindowsRoutes);
app.use("/api/participants", participantsRoutes);
app.use("/api/ratings", ratingsRoutes);
app.use("/api/labels", labelsRoutes);
app.use("/api/label-star-levels", labelStarLevelsRoutes);
app.use("/api/rating-labels", ratingLabelsRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/suspicious-activities", suspiciousActivitiesRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/export", exportRoutes);
app.use("/api/users", usersRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
