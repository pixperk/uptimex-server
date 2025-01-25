import { IHeartbeat } from "@app/interfaces/heartbeat.interface";
import {
  AppContext,
  IMonitorArgs,
  IMonitorDocument,
} from "@app/interfaces/monitor.interface";
import {
  createMonitor,
  deleteSingleMonitor,
  getHeartbeats,
  getMonitorById,
  getUserActiveMonitors,
  getUserMonitors,
  startCreatedMonitors,
  toggleMonitor,
  updateSingleMonitor,
} from "@app/services/monitor.service";
import { getSingleNotificationGroup } from "@app/services/notification.service";
import { startSingleJob, stopSingleBackgroundJob } from "@app/utils/jobs";
import {
  appTimeZone,
  authenticatedGraphQLRoute,
  resumeMonitors,
  uptimePercentage,
} from "@app/utils/utils";
import { PubSub } from "graphql-subscriptions";
import { some, toLower } from "lodash";

export const pubSub: PubSub = new PubSub();

export const UptimeMonitorResolver = {
  Query: {
    async getSingleMonitor(
      _: undefined,
      { monitorId }: { monitorId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      
      const monitor: IMonitorDocument = await getMonitorById(
        parseInt(monitorId!)
      );
      return {
        monitors: [monitor],
      };
    },
    async getUserMonitors(
      _: undefined,
      { userId }: { userId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const monitors: IMonitorDocument[] = await getUserMonitors(
        parseInt(userId!)
      );
      return {
        monitors,
      };
    },
    async autoRefresh(
      _: undefined,
      { userId, refresh }: { userId: string; refresh: boolean },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      if (refresh) {
        req.session = {
          ...req.session,
          enableAutomaticRefresh: true,
        };
        startSingleJob(
          `${toLower(req.currentUser?.username)}`,
          appTimeZone,
          10,
          async () => {
            const monitors: IMonitorDocument[] = await getUserActiveMonitors(
              parseInt(userId!)
            );
            pubSub.publish("MONITORS_UPDATED", {
              monitorsUpdated: {
                userId: parseInt(userId, 10),
                monitors,
              },
            });
          }
        );
      } else {
        req.session = {
          ...req.session,
          enableAutomaticRefresh: false,
        };
        stopSingleBackgroundJob(`${toLower(req.currentUser?.username)}`);
      }
      return {
        refresh,
      };
    },
  },
  Mutation: {
    async createMonitor(
      _: undefined,
      args: IMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const body: IMonitorDocument = args.monitor!;
      const monitor: IMonitorDocument = await createMonitor(body);
      if (body.active && monitor.active) {
        startCreatedMonitors(monitor, toLower(body.name), body.type);
      }
      return {
        monitors: [monitor],
      };
    },
    async toggleMonitor(
      _: undefined,
      args: IMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId, name, active } = args.monitor!;
      const results: IMonitorDocument[] = await toggleMonitor(
        monitorId!,
        userId,
        active as boolean
      );
      const hasActiveMonitors: boolean = some(
        results,
        (monitor: IMonitorDocument) => monitor.active
      );
      //Stop auto refresh if there are no active monitors for a single user
      if (!hasActiveMonitors) {
        req.session = {
          ...req.session,
          enableAutomaticRefresh: false,
        };
        stopSingleBackgroundJob(`${toLower(req.currentUser?.username)}`);
      }
      if (!active) {
        stopSingleBackgroundJob(name, monitorId);
      } else {
        resumeMonitors(monitorId!);
        startSingleJob(name, appTimeZone, 10, () =>
          console.log("Resumes every 10 secs")
        );
      }
      return {
        monitors: results,
      };
    },
    async deleteMonitor(
      _: undefined,
      args: IMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId, type } = args;
      await deleteSingleMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`),
        type!
      );

      return {
        id: monitorId,
      };
    },
    async updateMonitor(
      _: undefined,
      args: IMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId, monitor } = args;
      const monitors: IMonitorDocument[] = await updateSingleMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`),
        monitor!
      );

      return {
        monitors,
      };
    },
  },
  MonitorResult: {
    lastChanged: (monitor: IMonitorDocument) =>
      JSON.stringify(monitor.lastChanged),
    responseTime: (monitor: IMonitorDocument) => {
      return monitor.responseTime
        ? parseInt(`${monitor.responseTime}`)
        : monitor.responseTime;
    },
    notifications: (monitor: IMonitorDocument) => {
      return getSingleNotificationGroup(monitor.notificationId!);
    },
    heartbeats: async (monitor: IMonitorDocument) : Promise<IHeartbeat[]> => {
      const heartbeats = await getHeartbeats(monitor.type, monitor.id!, 24);
      return heartbeats.slice(0, 16);
    },
    uptime : async (monitor : IMonitorDocument) : Promise<number> => {
      const heartbeats : IHeartbeat[] = await getHeartbeats(monitor.type, monitor.id!, 24);
      return uptimePercentage(heartbeats);

    }
  },
  Subscription: {
    monitorsUpdated: {
      subscribe: () => pubSub.asyncIterableIterator(["MONITORS_UPDATED"]),
    },
  },
};
