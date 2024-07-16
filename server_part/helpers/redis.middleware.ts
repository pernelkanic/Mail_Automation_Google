import { Redis } from "ioredis";
require("dotenv").config()

const redisPort: number | undefined = process.env.redis_port ? parseInt(process.env.redis_port, 10) : undefined;
const redisHost: string = process.env.redis_host || 'localhost';

export const connection = new Redis(`redis://${redisHost}:${redisPort}`, {
    maxRetriesPerRequest: null,
  });


 export  const redisGetToken = async (email : string) => {
    try {
      const token = await connection.get(email);
      return token;
    } catch (error) {
        const myerror= error as Error
      console.error(`Error retrieving token from Redis for email ${email}:`, myerror.message);
      throw new Error(`Error retrieving token from Redis for email ${email}.`);
    }
  };
export default connection;