import { IHeartbeat } from "@app/interfaces/heartbeat.interface";
import { IMonitorDocument } from "@app/interfaces/monitor.interface";
import { PostgresModel } from "@app/models/postgres.model";
import { postgresMonitor } from "@app/monitors/postgres.monitor";

import { startSingleJob } from "@app/utils/jobs";
import { appTimeZone } from "@app/utils/utils";
import dayjs from "dayjs";
import { Model, Op } from "sequelize";

export const createPostgresHeartBeat = async (
  data: IHeartbeat
): Promise<IHeartbeat> => {
  try {
    const result: Model = await PostgresModel.create(data);
    return result.dataValues;
  } catch (error) {
    throw new Error(error);
  }
};

export const getPostgresHeartBeatsByDuration = async (
  monitorId: number,
  duration = 24
): Promise<IHeartbeat[]> => {
  try {
    const dateTime: Date = dayjs.utc().toDate();
    dateTime.setHours(dateTime.getHours() - duration);
    const heartbeats: IHeartbeat[] = (await PostgresModel.findAll({
      raw: true,
      where: {
        [Op.and]: [
          { monitorId },
          {
            timestamp: {
              [Op.gte]: dateTime,
            },
          },
        ],
      },
      order: [["timestamp", "DESC"]],
    })) as unknown as IHeartbeat[];
    return heartbeats;
  } catch (error) {
    throw new Error(error);
  }
};

export const postgresStatusMonitor = (
  monitor: IMonitorDocument,
  name: string
): void => {
  const postgresMonitorData: IMonitorDocument = {
    monitorId: monitor.id,
    url: monitor.url,
  } as IMonitorDocument;

  startSingleJob(name, appTimeZone, monitor.frequency, async () =>
    postgresMonitor.start(postgresMonitorData)
  );
};
