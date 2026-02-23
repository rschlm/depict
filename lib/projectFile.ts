import type { DepictorOptions } from "openchemlib";
import type { PropertyFilters } from "@/store/useChemStore";

export interface DepictProject {
  version: 1;
  smilesInput: string;
  displayOptions?: DepictorOptions;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  propertyFilters?: Partial<PropertyFilters>;
  molecules?: Array<{
    smiles: string;
    name?: string;
    tags?: string[];
  }>;
}

export async function exportProject(
  data: Omit<DepictProject, "version">
): Promise<void> {
  const project: DepictProject = { version: 1, ...data };
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const ts = new Date().toISOString().slice(0, 10);
  const filename = `depict_project_${ts}.depict`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importProject(file: File): Promise<DepictProject> {
  const text = await file.text();
  const data = JSON.parse(text) as DepictProject;
  if (!data.smilesInput && !data.molecules) {
    throw new Error("Invalid project file: missing smilesInput");
  }
  if (!data.smilesInput && data.molecules) {
    data.smilesInput = data.molecules.map((m) => m.smiles).join("\n");
  }
  return data;
}

export function triggerProjectFileOpen(): Promise<DepictProject | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".depict,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const project = await importProject(file);
        resolve(project);
      } catch (e) {
        reject(e);
      }
    };
    input.click();
  });
}
