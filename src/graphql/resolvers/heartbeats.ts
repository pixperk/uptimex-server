import { IHeartbeat, IHeartBeatArgs } from "@app/interfaces/heartbeat.interface";
import { AppContext } from "@app/interfaces/monitor.interface";
import { getHeartbeats } from "@app/services/monitor.service";
import { authenticatedGraphQLRoute } from "@app/utils/utils";

export const HeartbeatResolver = {
  Query: {
    async getHeartbeats(
      _: undefined,
      args: IHeartBeatArgs,
      contextValue: AppContext
    ) {
      const { req } = contextValue;
      authenticatedGraphQLRoute(req);
      const { type, monitorId, duration } = args;
      const heartbeats = await getHeartbeats(
        type,
        parseInt(monitorId),
        parseInt(duration)
      );
      return { heartbeats };
    },
  },
  HeartBeat : {
    timestamp : (heartbeat : IHeartbeat) => JSON.stringify(heartbeat.timestamp)
  }
};
