import mysql from "mysql2/promise";

const globalForMysql = globalThis as typeof globalThis & { mysqlPool?: mysql.Pool };
export const db = globalForMysql.mysqlPool ?? mysql.createPool({
  host: process.env.DB_HOST ?? "127.0.0.1",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME ?? "db_cbt_rei",
  charset: "utf8mb4", waitForConnections: true, connectionLimit: 10, queueLimit: 0,
});
if (process.env.NODE_ENV !== "production") globalForMysql.mysqlPool = db;
