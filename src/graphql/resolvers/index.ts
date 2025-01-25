import { HeartbeatResolver } from "./heartbeats";
import { UptimeMonitorResolver } from "./monitor";
import { NotificationResolver } from "./notification";
import { SSLMonitorResolver } from "./ssl";
import { UserResolver } from "./user";


export const resolvers = [
    UserResolver,
    NotificationResolver,
    UptimeMonitorResolver,
    HeartbeatResolver,
    SSLMonitorResolver
]