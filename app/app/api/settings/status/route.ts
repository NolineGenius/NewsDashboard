import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json(
      { error: "Nicht autorisiert" },
      { status: 401 }
    );
  }

  let claude = false;
  let firebase = false;

  // Check Claude API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && apiKey.startsWith("sk-ant-")) {
    claude = true;
  }

  // Check Firebase connection
  let adminDb;
  try {
    adminDb = getAdminDb();
    await adminDb.collection("profiles").limit(1).get();
    firebase = true;
  } catch {
    firebase = false;
  }

  // Check Ayrshare configuration
  let ayrshare = false;
  const ayrshareUrl = process.env.AYRSHARE_CREATE_PROFILE_URL;
  if (ayrshareUrl && adminDb) {
    try {
      const ayrshareDoc = await adminDb
        .collection("ayrshare_profiles")
        .doc(userId)
        .get();
      ayrshare = ayrshareDoc.exists;
    } catch {
      ayrshare = false;
    }
  }

  return NextResponse.json({ claude, firebase, ayrshare });
}
