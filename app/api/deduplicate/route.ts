import { NextRequest, NextResponse } from "next/server";
import { Molecule } from "openchemlib";
import { deduplicateMolecules, type DeduplicationMode } from "@/utils/chemUtils";

export const dynamic = "force-dynamic";

type Item = { smiles: string; mol: Molecule | null };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input = body.smiles;
    if (!Array.isArray(input)) {
      return NextResponse.json(
        { error: "Missing required field: smiles (array of strings)" },
        { status: 400 }
      );
    }
    const mode: DeduplicationMode =
      body.mode === "string" ? "string" : "canonical";
    const items: Item[] = [];
    for (const s of input) {
      const smiles = typeof s === "string" ? s.trim() : String(s).trim();
      if (!smiles) continue;
      let mol: Molecule | null = null;
      if (mode === "canonical") {
        try {
          mol = Molecule.fromSmiles(smiles);
        } catch {
          /* keep mol null, will use string key */
        }
      }
      items.push({ smiles, mol });
    }
    const { deduplicated, removedCount } = deduplicateMolecules(items, mode);
    const smiles = deduplicated.map((d) => d.smiles);
    return NextResponse.json({
      smiles,
      removedCount,
      totalBefore: items.length,
      totalAfter: smiles.length,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Deduplication failed" },
      { status: 500 }
    );
  }
}
