import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // This is a placeholder for the backend API endpoint
  // In production, proxy this to your NestJS backend or implement upload logic here
  return NextResponse.json({ message: "Not implemented" }, { status: 501 });
}
