import { NextRequest, NextResponse } from "next/server";
import { GoogleSpreadsheet } from "google-spreadsheet";
import { JWT } from "google-auth-library";
import { sendCapiEvent } from "@/lib/capi";

const SPREADSHEET_ID = "10gCm-fgHZ6eUY_-W0CGv-1JzFNtZDX7aeNdNUy24dnI";

const EXPECTED_HEADERS = [
  "Timestamp", "SubmissionId", "Platform", "Name", "Shop Name", "Phone",
  "GMV Month 3", "GMV Month 2", "GMV Month 1",
  "Product 1 Name", "Product 1 GMV", "Product 1 Price", "Product 1 HPP", "Product 1 Ad Spend", "Product 1 ROAS/ROI",
  "Product 2 Name", "Product 2 GMV", "Product 2 Price", "Product 2 HPP", "Product 2 Ad Spend", "Product 2 ROAS/ROI",
  "Product 3 Name", "Product 3 GMV", "Product 3 Price", "Product 3 HPP", "Product 3 Ad Spend", "Product 3 ROAS/ROI",
  "Final Score"
];

async function ensureHeaders(sheet: any, requestId: string) {
  try {
    if (sheet.columnCount < EXPECTED_HEADERS.length) {
      await sheet.resize({
        rowCount: sheet.rowCount || 100,
        columnCount: EXPECTED_HEADERS.length
      });
    }

    try {
      await sheet.loadHeaderRow();
    } catch {
      console.log(`[${requestId}] loadHeaderRow failed (normal if empty).`);
    }

    if (!sheet.headerValues || sheet.headerValues.length === 0) {
      await sheet.setHeaderRow(EXPECTED_HEADERS);
      let attempts = 0;
      while ((!sheet.headerValues || sheet.headerValues.length === 0) && attempts < 3) {
        try { await sheet.loadHeaderRow(); } catch { /* ignore */ }
        if (!sheet.headerValues || sheet.headerValues.length === 0) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        attempts++;
      }
    }

    if (!sheet.headerValues || sheet.headerValues.length === 0) {
      throw new Error(`Failed to load headers for sheet "${sheet.title}".`);
    }
  } catch (e: any) {
    throw e;
  }
}

export async function POST(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] Received save-to-sheet request`);

  try {
    const body = await req.json();
    const {
      sheetName = "full_submit",
      // tracking fields (not written to the sheet)
      fbc,
      fbp,
      eventId,
      eventSourceUrl,
      ...data
    } = body;

    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!serviceAccountEmail || !privateKey) {
      return NextResponse.json(
        { error: "Server configuration error: Missing Google credentials." },
        { status: 500 }
      );
    }

    // Handle escaped newlines in private key
    privateKey = privateKey.replace(/\\n/g, "\n");
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }

    const serviceAccountAuth = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    const doc = new GoogleSpreadsheet(SPREADSHEET_ID, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle[sheetName];
    if (!sheet) {
      sheet = await doc.addSheet({ title: sheetName });
    }

    await ensureHeaders(sheet, requestId);

    const row = {
      Timestamp: new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
      SubmissionId: data.submissionId ?? "",
      Platform: data.platform ?? "",
      Name: data.userName ?? "",
      "Shop Name": data.shopName ?? "",
      Phone: data.phoneNumber ?? "",
      "GMV Month 3": data.monthlyRevenue?.[0] ?? "",
      "GMV Month 2": data.monthlyRevenue?.[1] ?? "",
      "GMV Month 1": data.monthlyRevenue?.[2] ?? "",
      "Product 1 Name": data.topProducts?.[0]?.name ?? "",
      "Product 1 GMV": data.topProducts?.[0]?.revenue ?? "",
      "Product 1 Price": data.topProducts?.[0]?.price ?? "",
      "Product 1 HPP": data.topProducts?.[0]?.hpp ?? "",
      "Product 1 Ad Spend": data.topProducts?.[0]?.adSpend ?? "",
      "Product 1 ROAS/ROI": data.topProducts?.[0]?.roasRoi ?? "",
      "Product 2 Name": data.topProducts?.[1]?.name ?? "",
      "Product 2 GMV": data.topProducts?.[1]?.revenue ?? "",
      "Product 2 Price": data.topProducts?.[1]?.price ?? "",
      "Product 2 HPP": data.topProducts?.[1]?.hpp ?? "",
      "Product 2 Ad Spend": data.topProducts?.[1]?.adSpend ?? "",
      "Product 2 ROAS/ROI": data.topProducts?.[1]?.roasRoi ?? "",
      "Product 3 Name": data.topProducts?.[2]?.name ?? "",
      "Product 3 GMV": data.topProducts?.[2]?.revenue ?? "",
      "Product 3 Price": data.topProducts?.[2]?.price ?? "",
      "Product 3 HPP": data.topProducts?.[2]?.hpp ?? "",
      "Product 3 Ad Spend": data.topProducts?.[2]?.adSpend ?? "",
      "Product 3 ROAS/ROI": data.topProducts?.[2]?.roasRoi ?? "",
      "Final Score": (data.score !== undefined && data.score !== null && sheetName === "full_submit")
        ? data.score.toFixed(1)
        : ""
    };

    await sheet.addRow(row);
    console.log(`[${requestId}] Data saved to "${sheetName}"`);

    // ---- Conversions API (server-side) ----
    // Fire after the sheet write. Failures here never affect the response.
    try {
      const clientIp =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined;
      const clientUserAgent = req.headers.get("user-agent") || undefined;

      // Map the funnel stage to a standard Meta event.
      const eventName =
        sheetName === "full_submit" ? "CompleteRegistration" : "Lead";

      // Use the shared submissionId-based id so the browser pixel
      // and this server event get deduplicated by Meta.
      const finalEventId =
        eventId || `${eventName}_${data.submissionId ?? requestId}`;

      const customData: Record<string, any> = {};
      if (sheetName === "full_submit" && typeof data.score === "number") {
        customData.value = data.score;
        customData.currency = "IDR";
      }

      await sendCapiEvent({
        eventName,
        eventId: finalEventId,
        eventSourceUrl,
        user: {
          phoneNumber: data.phoneNumber,
          userName: data.userName,
          fbc,
          fbp,
          clientIp,
          clientUserAgent,
        },
        customData,
      });
    } catch (capiErr) {
      console.error(`[${requestId}] CAPI block error (ignored):`, capiErr);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[${requestId}] Error:`, error);
    return NextResponse.json(
      { error: error.message || "Failed to save data" },
      { status: 500 }
    );
  }
}
