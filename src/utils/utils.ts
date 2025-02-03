import { pubSub } from "@app/graphql/resolvers/monitor";
import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import { IAuthPayload } from "@app/interfaces/user.interface";
import { CLIENT_URL, JWT_TOKEN } from "@app/server/config";
import {
  getAllUserActiveMonitors,
  getMonitorById,
  getUserActiveMonitors,
  startCreatedMonitors,
} from "@app/services/monitor.service";
import { Request } from "express";
import { GraphQLError } from "graphql";
import { verify } from "jsonwebtoken";
import { toLower } from "lodash";
import { startSingleJob } from "./jobs";
import { IHeartbeat } from "@app/interfaces/heartbeat.interface";
import { IEmailLocals } from "@app/interfaces/notification.interface";
import { sendEmail } from "./email";
import { getAllUserActiveSSLMonitors, getSSLMonitorById, sslStatusMonitor } from "@app/services/ssl.service";
import { ISSLMonitorDocument } from "@app/interfaces/ssl.interface";

export const appTimeZone: string =
  Intl.DateTimeFormat().resolvedOptions().timeZone;
/**
 *
 * @param email
 * @returns {boolean}
 * @description : This function checks if the email is valid or not
 */
export const isEmail = (email: string): boolean => {
  const regexExp =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/gi;
  return regexExp.test(email);
};

/**
 *
 * @param req
 * @returns {void}
 * @description : This function checks if the user is authenticated or not
 */
export const authenticatedGraphQLRoute = (req: Request): void => {
  if (!req.session?.jwt) {
    throw new GraphQLError("Not Authenticated");
  }
  try {
    const payload: IAuthPayload = verify(
      req.session.jwt,
      JWT_TOKEN
    ) as IAuthPayload;
    req.currentUser = payload;
  } catch (error) {
    throw new GraphQLError("Not Authenticated");
  }
};

/**
 *
 * @param ms
 * @returns {Promise<void>}
 * @description : Delays for specified number of milliseconds
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 *
 * @param min
 * @param max
 * @returns  {number}
 * @description : Returns random integer
 */
export const getRandomInt = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const startMonitors = async (): Promise<void> => {
  const list: IMonitorDocument[] = await getAllUserActiveMonitors();
  for (const monitor of list) {
    startCreatedMonitors(monitor, toLower(monitor.name), monitor.type);
    await sleep(getRandomInt(300, 1000));
  }
};

export const startSSLMonitors = async (): Promise<void> => {
  const list: ISSLMonitorDocument[] = await getAllUserActiveSSLMonitors();
  for (const monitor of list) {
    sslStatusMonitor(monitor, toLower(monitor.name));
    await sleep(getRandomInt(300, 1000));
  }
};

export const resumeMonitors = async (monitorId: number): Promise<void> => {
  const monitor: IMonitorDocument = await getMonitorById(monitorId);

  startCreatedMonitors(monitor, toLower(monitor.name), monitor.type);
  await sleep(getRandomInt(300, 1000));
};

export const resumeSSLMonitors = async (monitorId: number): Promise<void> => {
  const monitor: ISSLMonitorDocument = await getSSLMonitorById(monitorId);

  sslStatusMonitor(monitor, toLower(monitor.name));
  await sleep(getRandomInt(300, 1000));
};

export const uptimePercentage = (heartbeats  : IHeartbeat[]) : number => {
  if(!heartbeats){
    return 0;
  }

  const totalHeartbeats : number = heartbeats.length;
  const downtimeHeartbeats : number = heartbeats.filter((heartbeat : IHeartbeat)=> heartbeat.status === 1).length;
  return Math.round(((totalHeartbeats - downtimeHeartbeats)/totalHeartbeats)*100) || 0;
}

const getCookies = (cookie: string): Record<string, string> => {
  const cookies: Record<string, string> = {};
  cookie.split(";").forEach((cookieData) => {
    const parts: RegExpMatchArray | null = cookieData.match(/(.*?)=(.*)$/);
    cookies[parts![1].trim()] = (parts![2] || "").trim();
  });
  return cookies;
};

export const enableAutoRefreshJob = (cookies: string): void => {
  const result: Record<string, string> = getCookies(cookies);
  const session: string = Buffer.from(result.session, "base64").toString();
  const payload: IAuthPayload = verify(
    JSON.parse(session).jwt,
    JWT_TOKEN
  ) as IAuthPayload;
  const enableAutoRefresh = JSON.parse(session).enableAutomaticRefresh;
  if (enableAutoRefresh) {
    startSingleJob(
      `${toLower(payload.username)}`,
      appTimeZone,
      10,
      async () => {
        const monitors: IMonitorDocument[] = await getUserActiveMonitors(
          payload.id
        );
        pubSub.publish("MONITORS_UPDATED", {
          monitorsUpdated: {
            userId: payload.id,
            monitors,
          },
        });
      }
    );
  }
};

export const encodeBase64 = (user : string, pass:string)  :string => {
  return Buffer.from(`${user || ''}:${pass||''}`).toString('base64');
}

export const emailSender = async (notificationEmails : string, template : string, locals : IEmailLocals) : Promise<void> => {
  const emails = JSON.parse(notificationEmails);
  for (const email of emails){
    await sendEmail(template, email, locals);
  }
}

export const locals = () : IEmailLocals => {
  return {
    appLink : `${CLIENT_URL}`,
    appIcon : '/placeholder.svg',
    appName : ''
  }
}

export const getDaysBetween = (from : Date, to : Date) : number => {
  return Math.round(Math.abs(+from- +to)/(1000 * 60 * 60 * 24));
}

export const getDaysRemainining = (from : Date, to : Date) : number => {
  const daysRemainining = getDaysBetween(from, to);
  if(new Date(to).getTime() < new Date().getTime()) return -daysRemainining;
  return daysRemainining
}