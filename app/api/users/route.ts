import { NextResponse } from "next/server";
import pool from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();

  const result = await pool.query(
    `
    INSERT INTO users (email, name, latitude, longitude)
    VALUES ($1, $2, $3, $4)
    RETURNING *
    `,
    [body.email, body.name, body.latitude, body.longitude]
  );

  return NextResponse.json(result.rows[0]);
}