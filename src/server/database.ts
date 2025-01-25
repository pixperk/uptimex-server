import {Sequelize} from "sequelize"
import { POSTGRES_DB } from "./config"
import logger from "./logger";

export const sequelize : Sequelize = new Sequelize(POSTGRES_DB,{
    dialect : 'postgres',
    logging : false,
})

export async function databaseConnection() : Promise<void> {
    try {
        await sequelize.authenticate();
        await sequelize.sync();
        logger.info('Postgres db has been connected');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        
    }
}