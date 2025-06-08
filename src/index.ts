import dns from 'dns';
dns.setDefaultResultOrder('ipv4first'); 
import express from "express";
import MonitorServer from "./server/server";
import { databaseConnection } from "./server/database";

const initialiseApp = (): void => {
  const app = express();
  const monitorServer = new MonitorServer(app);
  databaseConnection().then(() => {
    monitorServer.start();
     
  })
  .catch((err) => {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
  );
};

initialiseApp();
