"use client";

import { ReactionArrowStyle } from "@/store/useChemStore";
import { Check, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";

interface ArrowStyleSelectorProps {
  value: ReactionArrowStyle;
  onChange: (style: ReactionArrowStyle) => void;
  className?: string;
}

interface ArrowOption {
  value: ReactionArrowStyle;
  label: string;
  icon: React.ReactNode;
  description: string;
}

// Custom SVG arrow icons matching the actual rendering
const ForwardArrowIcon = () => (
  <svg width="18" height="4" viewBox="0 0 18 4" className="w-5 h-1">
    <polygon points="0 1.899977 12.49296 1.899977 12.49296 1.299977 0 1.299977" fill="currentColor"/>
    <path d="M17.692876,1.599977 C17.692876,1.599977 11.692966,3.149954 11.692966,3.149954 C11.692966,3.149954 12.442956,2.278092 12.442956,1.599977 C12.442956,0.899987 11.692966,0 11.692966,0 C11.692966,0 17.692876,1.599977 17.692876,1.599977 C17.692876,1.599977 17.692876,1.599977 17.692876,1.599977 Z" fill="currentColor"/>
  </svg>
);

const EquilibriumArrowIcon = () => (
  <svg width="18" height="5" viewBox="0 0 18 5" className="w-5 h-1.5">
    <polygon points="0.899987 1.899977 12.702557 1.899977 12.702557 1.299977 0.899987 1.299977" fill="currentColor"/>
    <polygon points="5.19992 3.699949 17.00249 3.699949 17.00249 3.099949 5.19992 3.099949" fill="currentColor"/>
    <path d="M17.902477,1.899977 C17.902477,1.899977 12.652557,1.899977 12.652557,1.899977 C12.652557,0.899987 11.902567,0 11.902567,0 C11.902567,0 17.902477,1.899977 17.902477,1.899977 C17.902477,1.899977 17.902477,1.899977 17.902477,1.899977 Z" fill="currentColor"/>
    <path d="M0,3.099949 C0,3.099949 5.999909,4.999926 5.999909,4.999926 C5.999909,4.999926 5.24992,3.499939 5.24992,3.099949 C5.24992,3.099949 0,3.099949 0,3.099949 C0,3.099949 0,3.099949 0,3.099949 Z" fill="currentColor"/>
  </svg>
);

const RetrosynthesisArrowIcon = () => (
  <svg width="30" height="8" viewBox="0 0 30 8" className="w-7 h-2">
    <line x1="0" y1="1.8" x2="28.20005" y2="1.8" stroke="currentColor" strokeLinecap="round"/>
    <line x1="28.20005" y1="1.8" x2="26.40005" y2="0" stroke="currentColor" strokeLinecap="round"/>
    <line x1="26.40005" y1="0" x2="30" y2="3.59995" stroke="currentColor" strokeLinecap="round"/>
    <line x1="30" y1="3.59995" x2="26.40005" y2="7.1999" stroke="currentColor" strokeLinecap="round"/>
    <line x1="26.40005" y1="7.1999" x2="28.20005" y2="5.3999" stroke="currentColor" strokeLinecap="round"/>
    <line x1="28.20005" y1="5.3999" x2="0" y2="5.3999" stroke="currentColor" strokeLinecap="round"/>
  </svg>
);

const NoGoArrowIcon = () => (
  <svg width="22" height="7" viewBox="0 0 22 7" className="w-5 h-2">
    <polygon points="0 3.499954 16.66768 3.499954 16.66768 2.899954 0 2.899954" fill="currentColor"/>
    <path d="M21.867607,3.199954 C21.867607,3.199954 15.867697,4.749931 15.867697,4.749931 C15.867697,4.749931 16.617687,3.878069 16.617687,3.199954 C16.617687,2.499964 15.867697,1.599977 15.867697,1.599977 C15.867697,1.599977 21.867607,3.199954 21.867607,3.199954 C21.867607,3.199954 21.867607,3.199954 21.867607,3.199954 Z" fill="currentColor"/>
    <polygon points="13.733757 6.399908 7.733847 0.4 8.133847 0 14.133757 5.999908" fill="currentColor"/>
    <polygon points="7.733847 5.999908 13.733757 0 14.133757 0.4 8.133847 6.399908" fill="currentColor"/>
  </svg>
);

const ResonanceArrowIcon = () => (
  <svg width="24" height="4" viewBox="0 0 24 4" className="w-6 h-1">
    <polygon points="5.19992 1.899978 17.86046 1.899978 17.86046 1.299978 5.19992 1.299978" fill="currentColor"/>
    <path d="M23.060382,1.599978 C23.060382,1.599978 17.060472,3.149955 17.060472,3.149955 C17.060472,3.149955 17.810462,2.278093 17.810462,1.599978 C17.810462,0.899988 17.060472,0 17.060472,0 C17.060472,0 23.060382,1.599978 23.060382,1.599978 C23.060382,1.599978 23.060382,1.599978 23.060382,1.599978 Z" fill="currentColor"/>
    <path d="M0,1.599978 C0,1.599978 5.999908,3.199955 5.999908,3.199955 C5.999908,3.199955 5.24992,2.299968 5.24992,1.599978 C5.24992,0.921863 5.999908,0.05 5.999908,0.05 C5.999908,0.05 0,1.599978 0,1.599978 C0,1.599978 0,1.599978 0,1.599978 Z" fill="currentColor"/>
  </svg>
);

const arrowOptions: ArrowOption[] = [
  {
    value: "forward",
    label: "Forward",
    icon: <ForwardArrowIcon />,
    description: "Standard forward reaction arrow (→)",
  },
  {
    value: "equilibrium",
    label: "Equilibrium",
    icon: <EquilibriumArrowIcon />,
    description: "Equilibrium reaction arrows (⇌)",
  },
  {
    value: "retrosynthesis",
    label: "Retro",
    icon: <RetrosynthesisArrowIcon />,
    description: "Retrosynthetic arrow (⇒)",
  },
  {
    value: "no-go",
    label: "No-Go",
    icon: <NoGoArrowIcon />,
    description: "Crossed out arrow (⊗)",
  },
  {
    value: "resonance",
    label: "Resonance",
    icon: <ResonanceArrowIcon />,
    description: "Resonance double arrow (↔)",
  },
];

export function ArrowStyleSelector({ value, onChange, className = "" }: ArrowStyleSelectorProps) {
  const selectedOption = arrowOptions.find((opt) => opt.value === value) || arrowOptions[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 px-3 text-xs justify-between min-w-[140px] ${className}`}
        >
          <span className="flex items-center gap-2">
            {selectedOption.icon}
            <span>{selectedOption.label}</span>
          </span>
          <ChevronDown className="w-3 h-3 ml-2 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[200px]">
        {arrowOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className="flex items-center justify-between cursor-pointer"
          >
            <span className="flex items-center gap-2">
              {option.icon}
              <div className="flex flex-col">
                <span className="text-sm font-medium">{option.label}</span>
                <span className="text-xs text-muted-foreground">{option.description}</span>
              </div>
            </span>
            {value === option.value && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
