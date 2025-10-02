import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";

import router from "./routes/api";
import { presaleNotifierCron } from "./cron/presaleNotifier";

import db from "./utils/database";
import docs from "./docs/route";
import errorMiddleware from "./middlewares/error.middleware";

async function init() {
  try {
    const PORT = 3400;
    const result = await db();

    console.log("database status: ", result);

    const app = express();

    app.use(cors());
    app.use(bodyParser.json());
    // Start cron job
    // presaleNotifierCron();
    // Serve static files from uploads folder
    app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

    app.get("/", (req, res) => {
      res.status(200).json({
        message: "Server is running",
        data: null,
      });
    });

    app.use("/api", router);
    docs(app);

    app.use(errorMiddleware.serverRoute());
    app.use(errorMiddleware.serverError());

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

init();
