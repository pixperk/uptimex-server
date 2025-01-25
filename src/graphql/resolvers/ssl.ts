import {
    AppContext
} from "@app/interfaces/monitor.interface";
import {
    ISSLMonitorArgs,
    ISSLMonitorDocument,
} from "@app/interfaces/ssl.interface";
import { getSingleNotificationGroup } from "@app/services/notification.service";
import {
    createSSLMonitor,
    deleteSingleSSLMonitor,
    getSSLMonitorById,
    getUserSSLMonitors,
    sslStatusMonitor,
    toggleSSLMonitor,
    updateSingleSSLMonitor,
} from "@app/services/ssl.service";
import { startSingleJob, stopSingleBackgroundJob } from "@app/utils/jobs";
import {
    appTimeZone,
    authenticatedGraphQLRoute,
    resumeSSLMonitors,
} from "@app/utils/utils";
import { PubSub } from "graphql-subscriptions";
import { toLower } from "lodash";

export const pubSub: PubSub = new PubSub();

export const SSLMonitorResolver = {
  Query: {
    async getSingleSSLMonitor(
      _: undefined,
      { monitorId }: { monitorId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);

      const monitor: ISSLMonitorDocument = await getSSLMonitorById(
        parseInt(monitorId!)
      );
      return {
        sslMonitors: [monitor],
      };
    },
    async getUserSSLMonitors(
      _: undefined,
      { userId }: { userId: string },
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const monitors: ISSLMonitorDocument[] = await getUserSSLMonitors(
        parseInt(userId!)
      );
      return {
        sslMonitors: monitors,
      };
    },
  },
  Mutation: {
    async createSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const body: ISSLMonitorDocument = args.monitor!;
      const monitor: ISSLMonitorDocument = await createSSLMonitor(body);
      if (body.active && monitor.active) {
        sslStatusMonitor(monitor, toLower(body.name));
      }
      return {
        sslMonitors: [monitor],
      };
    },
    async toggleSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId, name, active } = args.monitor!;
      const results: ISSLMonitorDocument[] = await toggleSSLMonitor(
        monitorId!,
        userId,
        active as boolean
      );
      if (!active) {
        stopSingleBackgroundJob(name, monitorId);
      } else {
        resumeSSLMonitors(monitorId!);
        startSingleJob(name, appTimeZone, 10, () =>
          console.log("Resumes every 10 secs")
        );
      }
      return {
        sslMonitors: results,
      };
    },
    async deleteSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId } = args;
      await deleteSingleSSLMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`)
      );

      return {
        id: parseInt(monitorId!),
      };
    },
    async updateSSLMonitor(
      _: undefined,
      args: ISSLMonitorArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { monitorId, userId, monitor } = args;
      const sslMonitors: ISSLMonitorDocument[] = await updateSingleSSLMonitor(
        parseInt(`${monitorId}`),
        parseInt(`${userId}`),
        monitor!
      );

      return {
        sslMonitors,
      };
    },
  },
  SSLMonitorResult: {
    notifications: (monitor: ISSLMonitorDocument) => {
      return getSingleNotificationGroup(monitor.notificationId!);
    },
  },
};
