"use client";

import Link from "next/link";
import {
  FileInput,
  Layers,
  Filter,
  ArrowUpDown,
  MousePointer2,
  Download,
  PanelRight,
  Share2,
  Keyboard,
  Code2,
  ArrowLeft,
  CheckCircle2,
  FileUp,
  Eraser,
  Copy,
  ExternalLink,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import AppLogo from "@/app/AppLogo";

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={title.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-24">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          )}
          <div className="text-sm text-muted-foreground space-y-3 prose prose-sm dark:prose-invert max-w-none">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureItem({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 py-2">
      <Icon className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" />
      <div>
        <strong className="text-foreground font-medium">{title}</strong>
        <span className="text-muted-foreground"> — {description}</span>
      </div>
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to Depict</span>
            </Link>
            <div className="flex items-center gap-2">
              <AppLogo className="h-5 w-auto" aria-hidden />
              <span className="font-semibold text-lg">epict User Guide</span>
            </div>
            <div className="w-24" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-3xl">
        {/* Summary */}
        <div className="mb-16 rounded-md border border-border/60 bg-muted/30 p-6">
          <h1 className="text-2xl font-bold text-foreground mb-3">Depict — Cheminformatics Dashboard</h1>
          <p className="text-muted-foreground leading-relaxed mb-6">
            Depict helps you visualize molecules and reactions, compute properties, filter and sort structures,
            and export data. Paste SMILES, import files, or draw structures. All tools are designed for clarity and speed.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>SMILES, MOL, SDF import</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Molecules & reaction SMILES</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Substructure & property filters</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Export SDF, SMI, CSV, SVG</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>Session persistence & sharing</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>REST API for automation</span>
            </div>
          </div>
        </div>

        <div className="space-y-14">
          <Section
            icon={FileInput}
            title="Input & Data"
            description="Get structures into Depict via paste, file import, or drawing."
          >
            <p>
              The main input accepts <strong>SMILES</strong> — one per line or comma-separated. Supported formats:
            </p>
            <ul className="list-disc pl-6 space-y-1 my-3">
              <li><strong>Molecules</strong> — e.g. <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">c1ccccc1</code>, <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">CC(=O)OC1=CC=CC=C1C(=O)O</code></li>
              <li><strong>Daylight reactions</strong> — <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">Reactants&gt;Products</code> or <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">Reactants&gt;Agents&gt;Products</code> (agents appear above the arrow)</li>
              <li><strong>Multi-step reactions</strong> — <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">A&gt;&gt;B&gt;&gt;C</code> (intermediates between steps)</li>
              <li><strong>Atom-mapped reactions</strong> — e.g. <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">[CH2:1]=[CH:2]...&gt;&gt;...</code> for tracking atoms</li>
            </ul>
            <div className="space-y-1">
              <FeatureItem icon={FileUp} title="Import" description="Drag & drop or click to load MOL, SDF, or SMI files. Structures are extracted and appended to the input." />
              <FeatureItem icon={BarChart3} title="Draw molecule" description="Open Ketcher to draw or edit structures. Save adds the result to your input." />
              <FeatureItem icon={CheckCircle2} title="Load sample" description="In the empty state, inserts demo SMILES (aspirin, caffeine, benzene, ethanol, esterification)." />
              <FeatureItem icon={Eraser} title="Clear" description="Empties the input. Use the Undo action in the toast to restore." />
              <FeatureItem icon={Copy} title="Copy invalid SMILES" description="The invalid-count badge has a dropdown to copy invalid entries for correction elsewhere." />
            </div>
            <p className="text-xs text-muted-foreground/90 pt-2">
              Valid and invalid counts appear next to the input. Invalid SMILES are highlighted in red and excluded from the grid.
            </p>
          </Section>

          <Section
            icon={Layers}
            title="Display Options"
            description="Control how structures and the grid are rendered. Open via the Display button in the header."
          >
            <h4 className="font-medium text-foreground mt-4 mb-2">Layout</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Cards per row</strong> — Slider from 2 to 10. Adjust grid density.</li>
              <li><strong>Reaction arrow style</strong> — Forward →, equilibrium ⇌, retrosynthesis, no-go ⊗, resonance ↔.</li>
            </ul>
            <h4 className="font-medium text-foreground mt-4 mb-2">Atom & Bond Display</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Show Atom Numbers</strong> — Display atom indices.</li>
              <li><strong>Show Bond Numbers</strong> — Display bond indices.</li>
              <li><strong>Draw Bonds in Gray</strong> — Gray bonds instead of black.</li>
              <li><strong>Hide Implicit Hydrogens</strong> — Omit implicit H atoms.</li>
              <li><strong>Hide Custom Labels</strong> / <strong>No Carbon with Custom Label</strong> — Control atom label visibility.</li>
            </ul>
            <h4 className="font-medium text-foreground mt-4 mb-2">Stereochemistry</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li>Chiral text position (above, below, frame top/bottom).</li>
              <li>Suppress CIP parity, ESR, stereo problems.</li>
            </ul>
            <h4 className="font-medium text-foreground mt-4 mb-2">Symmetry & Mapping</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Show Atom Mapping</strong> — Display map numbers and colored highlight circles for atom-mapped reactions.</li>
              <li>Simple/any symmetry, stereo heterotopicity.</li>
            </ul>
            <h4 className="font-medium text-foreground mt-4 mb-2">Card Display</h4>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Hide action buttons</strong> — Remove Download SVG, PubChem, eMolecules, Patents from cards.</li>
              <li><strong>Hide properties</strong> — Hide MW, LogP, TPSA, LogS, etc. on cards.</li>
            </ul>
          </Section>

          <Section
            icon={Filter}
            title="Filtering & Search"
            description="Narrow the visible set by substructure, properties, or type."
          >
            <h4 className="font-medium text-foreground mt-4 mb-2">Substructure Search</h4>
            <p>
              Enter SMILES or SMARTS in the substructure search field. Only molecules containing the pattern are shown.
              Invalid patterns trigger a toast; the input turns red. Clear the substructure search to show all.
            </p>
            <h4 className="font-medium text-foreground mt-4 mb-2">Property Filters</h4>
            <p>
              Click the filter chip to open. Set min/max ranges for: Molecular Weight, LogP, LogS, TPSA,
              rotatable bonds, H-bond donors (HBD), H-bond acceptors (HBA), stereo centers. Active filters
              appear as removable chips; remove a chip to clear that filter.
            </p>
            <h4 className="font-medium text-foreground mt-4 mb-2">Type Filter</h4>
            <p>
              In the header stats badge, click the <strong>molecule count</strong> to show only molecules,
              or the <strong>reaction count</strong> to show only reactions. Click again to clear and show all.
            </p>
            <h4 className="font-medium text-foreground mt-4 mb-2">Remove Duplicates</h4>
            <p>
              Dropdown in the input area. <strong>By canonical SMILES</strong> — structural identity; keeps
              first occurrence. <strong>By string</strong> — exact match. Toast shows how many were removed;
              Undo restores.
            </p>
          </Section>

          <Section
            icon={ArrowUpDown}
            title="Sorting & Reordering"
            description="Organize the grid by properties or input order."
          >
            <p>
              Sort by: <strong>Input order</strong>, MW, LogP, TPSA, LogS, rotatable bonds, HBD, HBA, stereo centers.
              Toggle ascending/descending with the arrow button.
            </p>
            <p className="mt-3">
              <strong>Drag to reorder</strong> — When sort is &quot;Input order&quot;, drag any card to reorder.
              The SMILES input updates to match. Properties are not recalculated; reordering is fluid.
            </p>
          </Section>

          <Section
            icon={MousePointer2}
            title="Selection & Batch Actions"
            description="Select multiple molecules for export or comparison."
          >
            <p>
              Hover a card to reveal the checkbox. <strong>Ctrl+Click</strong> (⌘+Click on Mac) toggles selection.
              <strong> Shift+Click</strong> selects a contiguous range.
            </p>
            <p className="mt-3">When at least one molecule is selected, a toolbar appears:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>Export selected</strong> — SDF, SMI, CSV (with column choice), SVG (ZIP).</li>
              <li><strong>Add to comparator</strong> — Pin up to 2 molecules for side-by-side comparison.</li>
              <li><strong>Clear selection</strong> — Deselect all.</li>
            </ul>
            <p className="text-xs text-muted-foreground/90 mt-3">
              The selection count distinguishes molecules vs reactions when both are present.
            </p>
          </Section>

          <Section
            icon={Download}
            title="Export"
            description="Export structures and properties in common formats."
          >
            <p>
              <strong>Export all</strong> or <strong>Export filtered</strong> — When filters or type filter are
              active, only the visible set is exported. Formats:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>SDF</strong> — MDL Structure-Data File. Standard for structure + properties.</li>
              <li><strong>SMI</strong> — SMILES only, one per line.</li>
              <li><strong>CSV</strong> — MW, LogP, LogS, TPSA, rotatable bonds, HBD, HBA, stereo centers. Use &quot;Choose columns&quot; to select which columns to include.</li>
              <li><strong>SVG (ZIP)</strong> — Each structure as a separate SVG in a ZIP archive.</li>
              <li><strong>Print / Save as PDF</strong> — Opens a print-friendly view in a new tab. Use the browser&apos;s Print (Ctrl+P) and choose &quot;Save as PDF&quot; to export.</li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground/90">
              Export uses the same list as the grid: filtered by substructure, property filters, and type filter.
            </p>
          </Section>

          <Section
            icon={PanelRight}
            title="Detail Panel & Comparison"
            description="Inspect a single structure or compare two side by side."
          >
            <p>
              <strong>Click a card</strong> to open the detail panel. Shows the structure, computed properties,
              and links to PubChem, eMolecules, and Google Patents. Action buttons (Download SVG, Copy SMILES, etc.)
              are available.
            </p>
            <p className="mt-3">
              <strong>Pin to comparator</strong> — From a card, pin a molecule. Pin a second to compare.
              The compare bar appears at the bottom with both structures side by side. Unpin to clear.
            </p>
          </Section>

          <Section
            icon={Share2}
            title="Sharing & Session"
            description="Share your work and persist state across reloads."
          >
            <p>
              <strong>Share link</strong> — Button next to Export in the header. Copies a URL with SMILES
              encoded in the <code className="text-xs bg-muted/60 px-1 rounded">data</code> parameter.
              Opening the link preloads the structures.
            </p>
            <p className="mt-3">
              <strong>Session persistence</strong> — SMILES input, display options, cards per row, hide action
              buttons, and hide properties are saved to session storage. On refresh, data is restored.
            </p>
            <p className="mt-3">
              <strong>Restore previous session</strong> — When you had data in a previous tab and return,
              a toast offers to restore that session from local storage.
            </p>
            <p className="mt-3">
              <strong>URL state</strong> — Filters, sort, and substructure query sync to the URL. Shareable
              links preserve these; back/forward navigation works as expected.
            </p>
          </Section>

          <Section
            icon={Keyboard}
            title="Keyboard Shortcuts"
            description="Speed up common actions. Shortcuts are disabled when typing in the SMILES input."
          >
            <h4 className="font-medium text-foreground mt-2 mb-2">Input</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Undo SMILES input</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Z</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Redo SMILES input</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>Z</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Copy all SMILES</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>C</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Paste from clipboard</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>V</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Clear input</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>C</Kbd></KbdGroup>
              </div>
            </div>
            <h4 className="font-medium text-foreground mt-4 mb-2">Panels</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Toggle display settings</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>D</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Toggle property filters</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>F</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Toggle property charts</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>B</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Expand/collapse input area</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>E</Kbd></KbdGroup>
              </div>
            </div>
            <h4 className="font-medium text-foreground mt-4 mb-2">Selection & Navigation</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Select molecule (toggle)</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Click</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Select range</span>
                <KbdGroup><Kbd>Shift</Kbd><span>+</span><Kbd>Click</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Clear selection</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>Shift</Kbd><span>+</span><Kbd>A</Kbd></KbdGroup>
              </div>
            </div>
            <h4 className="font-medium text-foreground mt-4 mb-2">General</h4>
            <div className="space-y-1">
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Open help page</span>
                <KbdGroup><Kbd>Ctrl</Kbd><span>+</span><Kbd>H</Kbd></KbdGroup>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Show shortcuts dialog</span>
                <Kbd>?</Kbd>
              </div>
              <div className="flex justify-between items-center gap-6 py-1.5 border-b border-border/40">
                <span>Close detail panel or dialog</span>
                <Kbd>Esc</Kbd>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Use <Kbd>⌘</Kbd> instead of Ctrl on Mac.
            </p>
          </Section>

          <Section
            icon={Code2}
            title="REST API"
            description="Programmatic access for AI agents and automation."
          >
            <p>
              All endpoints accept <code className="text-xs bg-muted/60 px-1 rounded">POST</code> with a JSON body.
              Base URL: <code className="text-xs bg-muted/60 px-1 rounded">/api/</code>
            </p>
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-border/60 p-4 bg-muted/20">
                <strong className="text-foreground">POST /api/parse</strong>
                <p className="text-xs text-muted-foreground mt-1">Parse SMILES; return validation, canonical form, and properties.</p>
                <code className="text-xs block mt-2">{`{ "smiles": "CCO\\nc1ccccc1" }`}</code>
              </div>
              <div className="rounded-md border border-border/60 p-4 bg-muted/20">
                <strong className="text-foreground">POST /api/svg</strong>
                <p className="text-xs text-muted-foreground mt-1">Generate SVG depiction for a molecule or reaction.</p>
                <code className="text-xs block mt-2">{`{ "smiles": "...", "width": 400, "height": 200, "format": "json" }`}</code>
              </div>
              <div className="rounded-md border border-border/60 p-4 bg-muted/20">
                <strong className="text-foreground">POST /api/deduplicate</strong>
                <p className="text-xs text-muted-foreground mt-1">Remove duplicates by canonical SMILES or exact string.</p>
                <code className="text-xs block mt-2">{`{ "smiles": ["CCO", "c1ccccc1", "CCO"], "mode": "canonical" }`}</code>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Full documentation: <code className="bg-muted/60 px-1 rounded">/api/README.md</code> or the API source.
            </p>
          </Section>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border/40">
          <p className="text-xs text-muted-foreground/80">
            Depict is built with OpenChemLib, Next.js, and Tailwind. Feedback and contributions welcome on{" "}
            <a href="https://github.com/rschlm/depict" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
              GitHub <ExternalLink className="h-3 w-3" />
            </a>.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Depict
          </Link>
        </footer>
      </main>
    </div>
  );
}
