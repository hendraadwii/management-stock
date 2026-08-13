import "server-only"
import { drizzle } from "drizzle-orm/mysql2"
import mysql from "mysql2/promise"
import * as schema from "@/db/schema"

const connectionString = process.env.DATABASE_URL!

const pool = mysql.createPool(connectionString)

export const db = drizzle(pool, { schema, mode: "default" })
