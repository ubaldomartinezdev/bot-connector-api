/* eslint-disable import/first */
require("dotenv-flow").config();

import cors from "cors";
import express, { Response } from "express";

import * as controllers from "./controllers";

const PORT = process.env.PORT || 5001;

const app = express();

app.use(cors());

app.get("/", (_, res: Response) => {
  res.status(200).json({ health: true });
});

app.use("/bidding", controllers.bidding);

app.listen(PORT, () => {
  console.log("Server is running on port: " + PORT);
});
