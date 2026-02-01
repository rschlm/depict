"use client";

import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { ArrowStyleSelector } from "./ArrowStyleSelector";
import { DepictorOptions } from "openchemlib";
import { useChemStore } from "@/store/useChemStore";
import {
  Atom,
  Shapes,
  CircleDot,
  Palette,
  ArrowRight,
  LayoutGrid,
} from "lucide-react";
import { Slider } from "./ui/slider";
import { CARDS_PER_ROW } from "@/constants/ui";

interface DisplaySettingsProps {
  settings: DepictorOptions;
  onChange: (settings: DepictorOptions) => void;
}

interface SettingGroup {
  title: string;
  icon: React.ReactNode;
  settings: SettingItem[];
}

interface SettingItem {
  key: string;
  label: string;
  description?: string;
}

export function DisplaySettings({ settings, onChange }: DisplaySettingsProps) {
  const reactionArrowStyle = useChemStore((state) => state.reactionArrowStyle);
  const setReactionArrowStyle = useChemStore((state) => state.setReactionArrowStyle);
  const cardsPerRow = useChemStore((state) => state.cardsPerRow);
  const setCardsPerRow = useChemStore((state) => state.setCardsPerRow);

  const updateSetting = (key: string, value: boolean) => {
    onChange({ ...settings, [key]: value });
  };

  const settingGroups: SettingGroup[] = [
    {
      title: "Atom & Bond Display",
      icon: <Atom className="w-3.5 h-3.5" />,
      settings: [
        { key: "showAtomNumber", label: "Show Atom Numbers" },
        { key: "showBondNumber", label: "Show Bond Numbers" },
        { key: "drawBondsInGray", label: "Draw Bonds in Gray" },
        { key: "noImplicitHydrogen", label: "Hide Implicit Hydrogens" },
        { key: "noAtomCustomLabels", label: "Hide Custom Labels" },
        { key: "noCarbonLabelWithCustomLabel", label: "No Carbon with Custom Label" },
      ],
    },
    {
      title: "Stereochemistry",
      icon: <Shapes className="w-3.5 h-3.5" />,
      settings: [
        { key: "suppressChiralText", label: "Suppress Chiral Text" },
        { key: "chiralTextAboveMolecule", label: "Chiral Text Above" },
        { key: "chiralTextBelowMolecule", label: "Chiral Text Below" },
        { key: "chiralTextOnFrameTop", label: "Chiral Text on Frame Top" },
        { key: "chiralTextOnFrameBottom", label: "Chiral Text on Frame Bottom" },
        { key: "suppressCIPParity", label: "Suppress CIP Parity" },
        { key: "suppressESR", label: "Suppress ESR" },
        { key: "noStereoProblem", label: "Hide Stereo Problems" },
      ],
    },
    {
      title: "Symmetry & Mapping",
      icon: <CircleDot className="w-3.5 h-3.5" />,
      settings: [
        { key: "showMapping", label: "Show Atom Mapping" },
        { key: "showSymmetrySimple", label: "Show Simple Symmetry" },
        { key: "showSymmetryAny", label: "Show Any Symmetry" },
        { key: "showSymmetryStereoHeterotopicity", label: "Show Stereo Heterotopicity" },
      ],
    },
    {
      title: "Colors & Highlighting",
      icon: <Palette className="w-3.5 h-3.5" />,
      settings: [
        { key: "highlightQueryFeatures", label: "Highlight Query Features" },
        { key: "noColorOnESRAndCIP", label: "No Color on ESR/CIP" },
        { key: "noImplicitAtomLabelColors", label: "No Implicit Label Colors" },
      ],
    },
  ];

  return (
    <div className="relative">
      {/* Cards per row Section */}
      <div className="mb-6">
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-background border-b border-border/40 mb-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted/50 text-muted-foreground">
              <LayoutGrid className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Cards per row
            </h3>
          </div>
        </div>
        <div className="px-1.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{CARDS_PER_ROW.MIN}</span>
            <span className="font-sans text-foreground/80 tabular-nums">{cardsPerRow}</span>
            <span>{CARDS_PER_ROW.MAX}</span>
          </div>
          <Slider
            value={cardsPerRow}
            onValueChange={setCardsPerRow}
            min={CARDS_PER_ROW.MIN}
            max={CARDS_PER_ROW.MAX}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground">
            Number of molecule cards shown per row in the grid
          </p>
        </div>
      </div>

      {/* Reaction Arrow Style Section */}
      <div className="mb-6">
        <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-background border-b border-border/40 mb-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 rounded bg-muted/50 text-muted-foreground">
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-xs font-semibold text-foreground tracking-tight">
              Reaction Arrow Style
            </h3>
          </div>
        </div>
        <div className="px-1.5">
          <ArrowStyleSelector 
            value={reactionArrowStyle} 
            onChange={setReactionArrowStyle}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground mt-2">
            Choose the arrow style for displaying chemical reactions
          </p>
        </div>
      </div>

      {settingGroups.map((group) => (
        <div key={group.title} className="mb-6 last:mb-0">
          {/* Sticky Group Header - Linear Style */}
          <div className="sticky top-0 z-20 -mx-4 px-4 py-2.5 bg-background border-b border-border/40 mb-3 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded bg-muted/50 text-muted-foreground">
                {group.icon}
              </div>
              <h3 className="text-xs font-semibold text-foreground tracking-tight">
                {group.title}
              </h3>
            </div>
          </div>

          {/* Settings List - Linear Style */}
          <div className="space-y-0">
            {group.settings.map((setting, index) => (
              <div
                key={setting.key}
                className={`group flex items-center justify-between px-1.5 py-2.5 -mx-1.5 rounded-md hover:bg-muted/40 transition-colors ${index < group.settings.length - 1 ? 'border-b border-border/20' : ''
                  }`}
              >
                <Label
                  htmlFor={setting.key}
                  className="cursor-pointer text-xs text-foreground/90 font-medium flex-1 group-hover:text-foreground transition-colors"
                >
                  {setting.label}
                </Label>
                <Switch
                  id={setting.key}
                  checked={(settings as Record<string, boolean>)[setting.key] ?? false}
                  onCheckedChange={(checked) => updateSetting(setting.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
