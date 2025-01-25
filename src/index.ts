import express from "express";
import MonitorServer from "./server/server";
import { databaseConnection } from "./server/database";

const initialiseApp = (): void => {
  const app = express();
  const monitorServer = new MonitorServer(app);
  databaseConnection().then(() => {
    monitorServer.start();
  });
};

initialiseApp();
