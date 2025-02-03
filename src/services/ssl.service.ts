import { ISSLMonitorDocument } from "@app/interfaces/ssl.interface";
import { SSLModel } from "@app/models/ssl.model";
import { sslMonitor } from "@app/monitors/ssl.monitor";
import { startSingleJob } from "@app/utils/jobs";
import { appTimeZone } from "@app/utils/utils";
import { Model, Op } from "sequelize";
import { getSingleNotificationGroup } from "./notification.service";

/**
 * Creates a new SSL monitor entry in the database.
 * @param data - The monitor data to be saved.
 * @returns The created SSL monitor document.
 */
export const createSSLMonitor = async (
  data: ISSLMonitorDocument
): Promise<ISSLMonitorDocument> => {
  try {
    const result: Model = await SSLModel.create(data);
    return result.dataValues;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Retrieves SSL monitors for a specific user.
 * @param userId - The ID of the user whose monitors are being retrieved.
 * @param active - Optional flag to filter active monitors.
 * @returns An array of SSL monitor documents.
 */
export const getUserSSLMonitors = async (
  userId: number,
  active?: boolean
): Promise<ISSLMonitorDocument[]> => {
  try {
    const monitors: ISSLMonitorDocument[] = (await SSLModel.findAll({
      raw: true,
      where: { [Op.and]: [{ userId, ...(active && { active: true }) }] },
      order: [["createdAt", "DESC"]],
    })) as unknown as ISSLMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Retrieves active SSL monitors for a specific user.
 * @param userId - The ID of the user whose active monitors are being retrieved.
 * @returns An array of active SSL monitor documents.
 */
export const getUserActiveSSLMonitors = async (
  userId: number
): Promise<ISSLMonitorDocument[]> => {
  try {
    const monitors: ISSLMonitorDocument[] = await getUserSSLMonitors(
      userId,
      true
    );
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Retrieves all active SSL monitors for all users.
 * @returns An array of active SSL monitor documents.
 */
export const getAllUserActiveSSLMonitors = async (): Promise<
  ISSLMonitorDocument[]
> => {
  try {
    const monitors: ISSLMonitorDocument[] = (await SSLModel.findAll({
      raw: true,
      where: { active: true },
      order: [["createdAt", "DESC"]],
    })) as unknown as ISSLMonitorDocument[];
    return monitors;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Retrieves a specific SSL monitor by its ID.
 * @param monitorId - The ID of the SSL monitor to retrieve.
 * @returns The SSL monitor document, including notifications if available.
 */
export const getSSLMonitorById = async (
  monitorId: number
): Promise<ISSLMonitorDocument> => {
  try {
    const monitor: ISSLMonitorDocument = (await SSLModel.findOne({
      raw: true,
      where: { id: monitorId },
    })) as unknown as ISSLMonitorDocument;
    let updatedMonitor: ISSLMonitorDocument = {
      ...monitor,
    };
    const notifications = await getSingleNotificationGroup(
      updatedMonitor.notificationId!
    );
    updatedMonitor = { ...updatedMonitor, notifications };
    return updatedMonitor;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Toggles the active status of a specific SSL monitor.
 * @param monitorId - The ID of the monitor to toggle.
 * @param userId - The ID of the user owning the monitor.
 * @param active - The new active status.
 * @returns An updated array of the user's SSL monitor documents.
 */
export const toggleSSLMonitor = async (
  monitorId: number,
  userId: number,
  active: boolean
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.update(
      { active },
      { where: { [Op.and]: [{ id: monitorId, userId }] } }
    );

    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Updates a specific SSL monitor with new data.
 * @param monitorId - The ID of the monitor to update.
 * @param userId - The ID of the user owning the monitor.
 * @param data - The updated data for the monitor.
 * @returns An updated array of the user's SSL monitor documents.
 */
export const updateSingleSSLMonitor = async (
  monitorId: number,
  userId: number,
  data: ISSLMonitorDocument
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.update(data, {
      where: {
        id: monitorId,
      },
    });

    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const updateSSLMonitorInfo = async (
  monitorId: number,
  infoData: string
): Promise<void> => {
  try {
    await SSLModel.update(
      {
        info: infoData,
      },
      {
        where: {
          id: monitorId,
        },
      }
    );
  } catch (error) {
    throw new Error(error);
  }
};

/**
 * Deletes a specific SSL monitor by its ID.
 * @param monitorId - The ID of the monitor to delete.
 * @param userId - The ID of the user owning the monitor.
 * @returns An updated array of the user's SSL monitor documents.
 */
export const deleteSingleSSLMonitor = async (
  monitorId: number,
  userId: number
): Promise<ISSLMonitorDocument[]> => {
  try {
    await SSLModel.destroy({
      where: {
        id: monitorId,
      },
    });
    const result: ISSLMonitorDocument[] = await getUserSSLMonitors(userId);
    return result;
  } catch (error) {
    throw new Error(error);
  }
};

export const sslStatusMonitor = (monitor : ISSLMonitorDocument, name : string) : void =>{
    const sslData : ISSLMonitorDocument = {
        monitorId : monitor.id,
        url : monitor.url
    } as ISSLMonitorDocument
    startSingleJob(name, appTimeZone, monitor.frequency, async()=>sslMonitor.start(sslData))
}
