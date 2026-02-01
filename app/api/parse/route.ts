import { NextRequest, NextResponse } from "next/server";
import { parseSmilesInput } from "@/lib/parseSmiles";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.smiles;
    if (input == null) {
      return NextResponse.json(
        { error: "Missing required field: smiles (string or string[])" },
        { status: 400 }
      );
    }
    const smilesInput =
      typeof input === "string" ? input : Array.isArray(input) ? input.join("\n") : null;
    if (smilesInput === null) {
      return NextResponse.json(
        { error: "smiles must be a string or array of strings" },
        { status: 400 }
      );
    }
    const result = parseSmilesInput(smilesInput);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Parse failed" },
      { status: 500 }
    );
  }
}
