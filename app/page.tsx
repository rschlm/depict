"use client";

import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Search, Filter, X, Loader2, AlertCircle, CheckCircle2, Layers, ArrowRight, BarChart3, ChevronDown, Sliders, Copy, Check, Pencil, Clipboard, Download, Undo2, Redo2, ArrowUp, ListOrdered, Scale, TestTube2, Crosshair, Droplets, RotateCw, Atom, Droplet, Target, Keyboard, CopyMinus, Link2, FileText, FileCode, Table2, SlidersHorizontal, Image, Printer } from "lucide-react";
import HexagonTwoTone from '@mui/icons-material/HexagonTwoTone';
import { MoleculeGrid } from "@/components/MoleculeGrid";
import { MoleculeGridSkeleton } from "@/components/MoleculeGridSkeleton";
import { SelectionToolbar } from "@/components/SelectionToolbar";
import { FileDropZone, FileImportButton } from "@/components/FileDropZone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmilesEditor } from "@/components/SmilesEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DisplaySettings } from "@/components/DisplaySettings";
import { ThemeSwitcher } from "@/components/ui/theme";
import { MoleculeDetailPanel } from "@/components/MoleculeDetailPanel";
import { KetcherPanel } from "@/components/KetcherPanel";
import { PropertyCharts } from "@/components/PropertyCharts";
import { Footer } from "@/components/Footer";
import AppLogo from "@/app/AppLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { parseSearchParams, buildSearchParams, type UrlFilterState } from "@/lib/urlState";
import { buildShareUrl } from "@/lib/shareLink";
import { SAMPLE_SMILES } from "@/constants/samples";
import {
  loadSession,
  saveSession,
  saveLastSession,
  loadLastSession,
  shouldShowRestorePrompt,
  markRestorePromptShown,
  type PersistedSession,
} from "@/lib/sessionPersistence";
import { useChemStore } from "@/store/useChemStore";
import { Molecule, DepictorOptions } from "openchemlib";
import { MoleculeData } from "@/store/useChemStore";
import { isReactionSmiles, parseReactionSmiles, deduplicateMolecules, type DeduplicationMode } from "@/utils/chemUtils";
import { exportAllAsSDF, exportAllAsCSV, exportAllAsSMI, CSV_COLUMNS, generateFilenameFromSmiles } from "@/utils/downloadUtils";
import { openPrintView } from "@/utils/printUtils";
import { CsvExportDialog } from "@/components/CsvExportDialog";
import { generateSVG } from "@/hooks/useCachedSVG";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { motion } from "motion/react";

function HomeContent() {
  const {
    setMolecules,
    reorderMolecules,
    calculateProperties,
    filteredMolecules,
    molecules,
    substructureSearch,
    clearSubstructureSearch,
    substructureQuery,
    loading,
    loadingProgress,
    error: storeError,
    lastSubstructureErrorAt,
    mwMin: storeMwMin,
    mwMax: storeMwMax,
    logPMin: storeLogPMin,
    logPMax: storeLogPMax,
    logSMin: storeLogSMin,
    logSMax: storeLogSMax,
    tpsaMin: storeTpsaMin,
    tpsaMax: storeTpsaMax,
    rotatableBondsMin: storeRotatableBondsMin,
    rotatableBondsMax: storeRotatableBondsMax,
    donorCountMin: storeDonorCountMin,
    donorCountMax: storeDonorCountMax,
    acceptorCountMin: storeAcceptorCountMin,
    acceptorCountMax: storeAcceptorCountMax,
    stereoCenterCountMin: storeStereoCenterCountMin,
    stereoCenterCountMax: storeStereoCenterCountMax,
    setPropertyFilters,
    clearPropertyFilters,
    sortBy,
    sortOrder,
    setSort,
    reactionArrowStyle,
    pinMolecule,
    clearPinnedMolecules,
    cardsPerRow,
    setCardsPerRow,
  } = useChemStore();

  const substructureError = storeError != null && storeError.startsWith("Substructure search failed");

  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [substructureInput, setSubstructureInput] = useState("");
  const [smilesInput, setSmilesInput] = useState("");
  const [displayOptions, setDisplayOptions] = useState<DepictorOptions>({
    suppressChiralText: true,
  });
  const [showDisplaySettings, setShowDisplaySettings] = useState(false);
  const [selectedMolecule, setSelectedMolecule] = useState<MoleculeData | null>(null);
  const [showMoleculeDetail, setShowMoleculeDetail] = useState(false);
  const [inputExpanded, setInputExpanded] = useState(true);
  const [showPropertyFilters, setShowPropertyFilters] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [hoveredMolecule, setHoveredMolecule] = useState<MoleculeData | null>(null);
  const [smilesCopied, setSmilesCopied] = useState(false);
  const [hideActionButtons, setHideActionButtons] = useState(false);
  const [hideProperties, setHideProperties] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<"all" | "molecules" | "reactions">("all");

  const [csvExportDialogOpen, setCsvExportDialogOpen] = useState(false);
  const [csvExportTarget, setCsvExportTarget] = useState<{
    molecules: MoleculeData[];
    filename?: string;
  } | null>(null);

  // Ketcher editor state
  const [showKetcherDialog, setShowKetcherDialog] = useState(false);
  const [ketcherMode, setKetcherMode] = useState<"draw" | "edit">("draw");
  const [moleculeToEdit, setMoleculeToEdit] = useState<string | undefined>(undefined);

  // Undo/redo for SMILES input
  const INPUT_HISTORY_MAX = 50;
  const [inputHistory, setInputHistory] = useState<string[]>([""]);
  const [inputHistoryIndex, setInputHistoryIndex] = useState(0);
  const skipNextPushRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const debouncePushRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyIndexRef = useRef(0);
  historyIndexRef.current = inputHistoryIndex;

  const handleSmilesInputChange = useCallback((value: string) => {
    setSmilesInput(value);
    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }
    if (debouncePushRef.current) clearTimeout(debouncePushRef.current);
    const valueToPush = value;
    debouncePushRef.current = setTimeout(() => {
      debouncePushRef.current = null;
      if (skipNextPushRef.current) return;
      const idx = historyIndexRef.current;
      setInputHistory((prev) => {
        const truncated = prev.slice(0, idx + 1);
        if (truncated[truncated.length - 1] === valueToPush) return prev;
        const next = [...truncated, valueToPush];
        return next.length > INPUT_HISTORY_MAX ? next.slice(-INPUT_HISTORY_MAX) : next;
      });
      setInputHistoryIndex((prev) => {
        const truncated = inputHistory.slice(0, prev + 1);
        return Math.min(truncated.length, INPUT_HISTORY_MAX - 1);
      });
    }, 600);
  }, [inputHistory]);

  const handleUndo = useCallback(() => {
    if (inputHistoryIndex <= 0) return;
    skipNextPushRef.current = true;
    const nextIndex = inputHistoryIndex - 1;
    setInputHistoryIndex(nextIndex);
    setSmilesInput(inputHistory[nextIndex] ?? "");
  }, [inputHistoryIndex, inputHistory]);

  const handleRedo = useCallback(() => {
    if (inputHistoryIndex >= inputHistory.length - 1) return;
    skipNextPushRef.current = true;
    const nextIndex = inputHistoryIndex + 1;
    setInputHistoryIndex(nextIndex);
    setSmilesInput(inputHistory[nextIndex] ?? "");
  }, [inputHistoryIndex, inputHistory]);

  const handleClear = useCallback(() => {
    const previous = smilesInput;
    if (!previous.trim()) return;
    skipNextPushRef.current = true;
    handleSmilesInputChange("");
    toast.success("Input cleared", {
      action: {
        label: "Undo",
        onClick: () => {
          skipNextPushRef.current = true;
          handleSmilesInputChange(previous);
        },
      },
    });
  }, [smilesInput, handleSmilesInputChange]);

  // Calculate molecule and reaction counts (from filtered set)
  const moleculeCount = useMemo(() => {
    return filteredMolecules.filter(m => m.mol !== null).length;
  }, [filteredMolecules]);

  const reactionCount = useMemo(() => {
    return filteredMolecules.filter(m => m.mol === null).length;
  }, [filteredMolecules]);

  // Apply type filter: molecules only, reactions only, or all
  const displayedMolecules = useMemo(() => {
    if (typeFilter === "molecules") return filteredMolecules.filter(m => m.mol !== null);
    if (typeFilter === "reactions") return filteredMolecules.filter(m => m.mol === null);
    return filteredMolecules;
  }, [filteredMolecules, typeFilter]);

  const handleReorder = useCallback(
    (reordered: MoleculeData[]) => {
      const displayedIds = new Set(displayedMolecules.map((m) => m.id));
      const rest = molecules.filter((m) => !displayedIds.has(m.id));
      const newMolecules = [...reordered, ...rest];
      const newSmiles = newMolecules.map((m) => m.smiles).join("\n");
      skipNextPushRef.current = true;
      skipNextSyncRef.current = true;
      handleSmilesInputChange(newSmiles);
      reorderMolecules(newMolecules);
    },
    [molecules, displayedMolecules, handleSmilesInputChange, reorderMolecules]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as Node | null;
      const inInput = target && document.body.contains(target) &&
        (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable));

      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }

      if (!inInput) {
        if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          setShowShortcutsHelp((open) => !open);
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "c") {
          e.preventDefault();
          handleClear();
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "d") {
          e.preventDefault();
          setShowDisplaySettings((open) => !open);
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "f") {
          e.preventDefault();
          setShowPropertyFilters((open) => !open);
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "b") {
          e.preventDefault();
          setShowCharts((open) => !open);
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "e") {
          e.preventDefault();
          setInputExpanded((v) => !v);
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "h" && !e.shiftKey) {
          e.preventDefault();
          router.push("/help");
        }
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
          e.preventDefault();
          if (selectedIds.size > 0) setSelectedIds(new Set());
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "c" && !e.shiftKey) {
          e.preventDefault();
          const toCopy = smilesInput.trim() || displayedMolecules.map((m) => m.smiles).join("\n");
          if (toCopy) {
            navigator.clipboard.writeText(toCopy).then(() => toast.success("SMILES copied to clipboard"));
          }
        }
        if ((e.ctrlKey || e.metaKey) && e.key === "v" && !e.shiftKey) {
          e.preventDefault();
          setInputExpanded(true);
          navigator.clipboard.readText().then((text) => {
            if (text.trim()) handleSmilesInputChange(text.trim());
          });
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, handleClear, router, selectedIds, smilesInput, displayedMolecules, handleSmilesInputChange]);

  const canUndo = inputHistoryIndex > 0;
  const canRedo = inputHistoryIndex < inputHistory.length - 1;

  // Show tooltips only when button text is hidden (contracted) on small screens
  const smMatches = useMediaQuery("(min-width: 640px)");
  const mdMatches = useMediaQuery("(min-width: 768px)");
  const lgMatches = useMediaQuery("(min-width: 1024px)");

  // Restore session from sessionStorage or URL data param (shared link) on mount
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;
    const parsed = parseSearchParams(searchParams);
    if (parsed.smilesData != null && parsed.smilesData !== "") {
      setSmilesInput(parsed.smilesData);
      setInputHistory([parsed.smilesData]);
      setInputHistoryIndex(0);
      const session = loadSession();
      const defaults = {
        displayOptions: { suppressChiralText: true },
        cardsPerRow: 4,
        hideActionButtons: false,
        hideProperties: false,
      };
      if (session) {
        setDisplayOptions(session.displayOptions);
        setHideActionButtons(session.hideActionButtons);
        setHideProperties(session.hideProperties);
        setCardsPerRow(session.cardsPerRow);
      }
      saveSession({
        smilesInput: parsed.smilesData,
        displayOptions: session?.displayOptions ?? defaults.displayOptions,
        cardsPerRow: session?.cardsPerRow ?? defaults.cardsPerRow,
        hideActionButtons: session?.hideActionButtons ?? defaults.hideActionButtons,
        hideProperties: session?.hideProperties ?? defaults.hideProperties,
      });
      return;
    }
    const session = loadSession();
    if (session) {
      setSmilesInput(session.smilesInput);
      setDisplayOptions(session.displayOptions);
      setHideActionButtons(session.hideActionButtons);
      setHideProperties(session.hideProperties);
      setCardsPerRow(session.cardsPerRow);
      setInputHistory([session.smilesInput]);
      setInputHistoryIndex(0);
      saveSession(session);
    }
  }, [setCardsPerRow, searchParams]);

  // Persist session to sessionStorage when state changes (debounce smilesInput)
  // Also save to localStorage so "Restore previous session?" works when opening a new tab (beforeunload is unreliable)
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const data: PersistedSession = {
      smilesInput,
      displayOptions,
      cardsPerRow,
      hideActionButtons,
      hideProperties,
    };
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      persistTimeoutRef.current = null;
      saveSession(data);
      if (data.smilesInput.trim()) saveLastSession(data);
    }, 500);
    return () => {
      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    };
  }, [smilesInput, displayOptions, cardsPerRow, hideActionButtons, hideProperties]);

  // Keep refs in sync for beforeunload (so we always save latest even if debounce hasn't fired)
  const sessionRef = useRef<PersistedSession>({
    smilesInput: "",
    displayOptions: { suppressChiralText: true },
    cardsPerRow: 4,
    hideActionButtons: false,
    hideProperties: false,
  });
  sessionRef.current = {
    smilesInput,
    displayOptions,
    cardsPerRow,
    hideActionButtons,
    hideProperties,
  };

  // Save to localStorage on beforeunload for "Restore previous session?" on next visit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (molecules.length > 0) {
        e.preventDefault();
        e.returnValue = ""; // Chrome requires returnValue to be set
      }
      if (sessionRef.current.smilesInput.trim()) saveLastSession(sessionRef.current);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [molecules.length]);

  // URL state sync: filters and sort (Next.js App Router)
  const skipNextUrlPushRef = useRef(false);

  // Apply URL -> store (on load and when user navigates back/forward)
  useEffect(() => {
    const parsed = parseSearchParams(searchParams);
    const hasSort = parsed.sortBy != null && (parsed.sortBy !== sortBy || parsed.sortOrder !== sortOrder);
    const hasSub = parsed.substructureQuery != null && parsed.substructureQuery !== substructureQuery;
    const hasFilters =
      (parsed.mwMin ?? null) !== storeMwMin ||
      (parsed.mwMax ?? null) !== storeMwMax ||
      (parsed.logPMin ?? null) !== storeLogPMin ||
      (parsed.logPMax ?? null) !== storeLogPMax ||
      (parsed.logSMin ?? null) !== storeLogSMin ||
      (parsed.logSMax ?? null) !== storeLogSMax ||
      (parsed.tpsaMin ?? null) !== storeTpsaMin ||
      (parsed.tpsaMax ?? null) !== storeTpsaMax ||
      (parsed.rotatableBondsMin ?? null) !== storeRotatableBondsMin ||
      (parsed.rotatableBondsMax ?? null) !== storeRotatableBondsMax ||
      (parsed.donorCountMin ?? null) !== storeDonorCountMin ||
      (parsed.donorCountMax ?? null) !== storeDonorCountMax ||
      (parsed.acceptorCountMin ?? null) !== storeAcceptorCountMin ||
      (parsed.acceptorCountMax ?? null) !== storeAcceptorCountMax ||
      (parsed.stereoCenterCountMin ?? null) !== storeStereoCenterCountMin ||
      (parsed.stereoCenterCountMax ?? null) !== storeStereoCenterCountMax;
    if (!hasSort && !hasSub && !hasFilters) return;

    skipNextUrlPushRef.current = true;
    if (hasSort && parsed.sortBy != null) setSort(parsed.sortBy, parsed.sortOrder ?? "asc");
    if (hasFilters) {
      setPropertyFilters({
        mwMin: parsed.mwMin ?? null,
        mwMax: parsed.mwMax ?? null,
        logPMin: parsed.logPMin ?? null,
        logPMax: parsed.logPMax ?? null,
        logSMin: parsed.logSMin ?? null,
        logSMax: parsed.logSMax ?? null,
        tpsaMin: parsed.tpsaMin ?? null,
        tpsaMax: parsed.tpsaMax ?? null,
        rotatableBondsMin: parsed.rotatableBondsMin ?? null,
        rotatableBondsMax: parsed.rotatableBondsMax ?? null,
        donorCountMin: parsed.donorCountMin ?? null,
        donorCountMax: parsed.donorCountMax ?? null,
        acceptorCountMin: parsed.acceptorCountMin ?? null,
        acceptorCountMax: parsed.acceptorCountMax ?? null,
        stereoCenterCountMin: parsed.stereoCenterCountMin ?? null,
        stereoCenterCountMax: parsed.stereoCenterCountMax ?? null,
      });
    }
    if (hasSub && parsed.substructureQuery != null) {
      setSubstructureInput(parsed.substructureQuery);
      substructureSearch(parsed.substructureQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when URL changes, not when store updates
  }, [searchParams]);

  // Sync store -> URL when sort/filters/substructure change (skip once after applying from URL)
  useEffect(() => {
    if (skipNextUrlPushRef.current) {
      skipNextUrlPushRef.current = false;
      return;
    }
    const state: UrlFilterState = {
      sortBy,
      sortOrder,
      substructureQuery,
      mwMin: storeMwMin ?? null,
      mwMax: storeMwMax ?? null,
      logPMin: storeLogPMin ?? null,
      logPMax: storeLogPMax ?? null,
      logSMin: storeLogSMin ?? null,
      logSMax: storeLogSMax ?? null,
      tpsaMin: storeTpsaMin ?? null,
      tpsaMax: storeTpsaMax ?? null,
      rotatableBondsMin: storeRotatableBondsMin ?? null,
      rotatableBondsMax: storeRotatableBondsMax ?? null,
      donorCountMin: storeDonorCountMin ?? null,
      donorCountMax: storeDonorCountMax ?? null,
      acceptorCountMin: storeAcceptorCountMin ?? null,
      acceptorCountMax: storeAcceptorCountMax ?? null,
      stereoCenterCountMin: storeStereoCenterCountMin ?? null,
      stereoCenterCountMax: storeStereoCenterCountMax ?? null,
    };
    const params = buildSearchParams(state);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [
    sortBy,
    sortOrder,
    substructureQuery,
    storeMwMin,
    storeMwMax,
    storeLogPMin,
    storeLogPMax,
    storeLogSMin,
    storeLogSMax,
    storeTpsaMin,
    storeTpsaMax,
    storeRotatableBondsMin,
    storeRotatableBondsMax,
    storeDonorCountMin,
    storeDonorCountMax,
    storeAcceptorCountMin,
    storeAcceptorCountMax,
    storeStereoCenterCountMin,
    storeStereoCenterCountMax,
    pathname,
    router,
  ]);

  // "Restore previous session?" toast on next visit when last session had data
  useEffect(() => {
    if (!shouldShowRestorePrompt()) return;
    markRestorePromptShown();
    const last = loadLastSession();
    if (!last?.smilesInput?.trim()) return;
    toast("Restore previous session?", {
      description: "You had molecules and display settings from your last visit.",
      action: {
        label: "Restore",
        onClick: () => {
          setSmilesInput(last.smilesInput);
          setDisplayOptions(last.displayOptions);
          setHideActionButtons(last.hideActionButtons);
          setHideProperties(last.hideProperties);
          setCardsPerRow(last.cardsPerRow);
          setInputHistory([last.smilesInput]);
          setInputHistoryIndex(0);
          saveSession(last);
          toast.success("Session restored");
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for restore prompt
  }, []);

  // Sonner toast when substructure search fails (deferred to avoid Sonner internal useEffect dependency churn)
  useEffect(() => {
    if (lastSubstructureErrorAt == null || storeError == null || !storeError.startsWith("Substructure search failed")) return;
    const message = storeError.replace(/^Substructure search failed:?\s*/i, "").trim() || "Invalid SMILES or SMARTS";
    const id = setTimeout(() => {
      toast.error(message);
    }, 0);
    return () => clearTimeout(id);
  }, [lastSubstructureErrorAt, storeError]);

  // Property filter values for controlled inputs (store holds number | null; we display as string)
  const mwMin = storeMwMin != null ? String(storeMwMin) : "";
  const mwMax = storeMwMax != null ? String(storeMwMax) : "";
  const logPMin = storeLogPMin != null ? String(storeLogPMin) : "";
  const logPMax = storeLogPMax != null ? String(storeLogPMax) : "";
  const logSMin = storeLogSMin != null ? String(storeLogSMin) : "";
  const logSMax = storeLogSMax != null ? String(storeLogSMax) : "";
  const tpsaMin = storeTpsaMin != null ? String(storeTpsaMin) : "";
  const tpsaMax = storeTpsaMax != null ? String(storeTpsaMax) : "";
  const rotatableBondsMin = storeRotatableBondsMin != null ? String(storeRotatableBondsMin) : "";
  const rotatableBondsMax = storeRotatableBondsMax != null ? String(storeRotatableBondsMax) : "";
  const donorCountMin = storeDonorCountMin != null ? String(storeDonorCountMin) : "";
  const donorCountMax = storeDonorCountMax != null ? String(storeDonorCountMax) : "";
  const acceptorCountMin = storeAcceptorCountMin != null ? String(storeAcceptorCountMin) : "";
  const acceptorCountMax = storeAcceptorCountMax != null ? String(storeAcceptorCountMax) : "";
  const stereoCenterCountMin = storeStereoCenterCountMin != null ? String(storeStereoCenterCountMin) : "";
  const stereoCenterCountMax = storeStereoCenterCountMax != null ? String(storeStereoCenterCountMax) : "";

  // Visible filter chips count: fewer on narrow screens so chips row stays in one line
  const [visibleFilterCount, setVisibleFilterCount] = useState(3);
  useEffect(() => {
    const mq3 = window.matchMedia("(min-width: 1024px)");
    const mq2 = window.matchMedia("(min-width: 640px)");
    const update = () => {
      setVisibleFilterCount(mq3.matches ? 3 : mq2.matches ? 2 : 1);
    };
    update();
    mq3.addEventListener("change", update);
    mq2.addEventListener("change", update);
    return () => {
      mq3.removeEventListener("change", update);
      mq2.removeEventListener("change", update);
    };
  }, []);

  // Active filters for display (all properties; header shows first N then "+N more")
  const activeFilters = useMemo(() => {
    const filters: Array<{ id: string; label: string; value: string; onRemove: () => void }> = [];

    // Only show substructure badge when applied successfully (no parse error)
    if (substructureQuery && !substructureError) {
      filters.push({
        id: 'substructure',
        label: 'Substructure search',
        value: substructureQuery,
        onRemove: () => clearSubstructureSearch()
      });
    }

    if (storeMwMin != null || storeMwMax != null) {
      filters.push({
        id: 'mw',
        label: 'MW',
        value: `${mwMin || '0'} - ${mwMax || '∞'}`,
        onRemove: () => setPropertyFilters({ mwMin: null, mwMax: null }),
      });
    }

    if (storeLogPMin != null || storeLogPMax != null) {
      filters.push({
        id: 'logp',
        label: 'LogP',
        value: `${logPMin || '-∞'} - ${logPMax || '∞'}`,
        onRemove: () => setPropertyFilters({ logPMin: null, logPMax: null }),
      });
    }

    if (storeLogSMin != null || storeLogSMax != null) {
      filters.push({
        id: 'logS',
        label: 'LogS',
        value: `${logSMin || '-∞'} - ${logSMax || '∞'}`,
        onRemove: () => setPropertyFilters({ logSMin: null, logSMax: null }),
      });
    }

    if (storeTpsaMin != null || storeTpsaMax != null) {
      filters.push({
        id: 'tpsa',
        label: 'TPSA',
        value: `${tpsaMin || '0'} - ${tpsaMax || '∞'}`,
        onRemove: () => setPropertyFilters({ tpsaMin: null, tpsaMax: null }),
      });
    }

    if (storeRotatableBondsMin != null || storeRotatableBondsMax != null) {
      filters.push({
        id: 'rotatableBonds',
        label: 'Rot. bonds',
        value: `${rotatableBondsMin ?? '0'} - ${rotatableBondsMax ?? '∞'}`,
        onRemove: () => setPropertyFilters({ rotatableBondsMin: null, rotatableBondsMax: null }),
      });
    }

    if (storeDonorCountMin != null || storeDonorCountMax != null) {
      filters.push({
        id: 'donorCount',
        label: 'HBD',
        value: `${donorCountMin ?? '0'} - ${donorCountMax ?? '∞'}`,
        onRemove: () => setPropertyFilters({ donorCountMin: null, donorCountMax: null }),
      });
    }

    if (storeAcceptorCountMin != null || storeAcceptorCountMax != null) {
      filters.push({
        id: 'acceptorCount',
        label: 'HBA',
        value: `${acceptorCountMin ?? '0'} - ${acceptorCountMax ?? '∞'}`,
        onRemove: () => setPropertyFilters({ acceptorCountMin: null, acceptorCountMax: null }),
      });
    }

    if (storeStereoCenterCountMin != null || storeStereoCenterCountMax != null) {
      filters.push({
        id: 'stereoCenterCount',
        label: 'Stereo',
        value: `${stereoCenterCountMin ?? '0'} - ${stereoCenterCountMax ?? '∞'}`,
        onRemove: () => setPropertyFilters({ stereoCenterCountMin: null, stereoCenterCountMax: null }),
      });
    }

    return filters;
  }, [
    substructureQuery,
    substructureError,
    storeMwMin, storeMwMax, storeLogPMin, storeLogPMax, storeLogSMin, storeLogSMax,
    storeTpsaMin, storeTpsaMax, storeRotatableBondsMin, storeRotatableBondsMax,
    storeDonorCountMin, storeDonorCountMax, storeAcceptorCountMin, storeAcceptorCountMax,
    storeStereoCenterCountMin, storeStereoCenterCountMax,
    mwMin, mwMax, logPMin, logPMax, logSMin, logSMax, tpsaMin, tpsaMax,
    rotatableBondsMin, rotatableBondsMax, donorCountMin, donorCountMax, acceptorCountMin, acceptorCountMax,
    stereoCenterCountMin, stereoCenterCountMax,
    clearSubstructureSearch, setPropertyFilters,
  ]);

  // Parse SMILES from input (newline or comma separated) and track invalid ones
  const { validSmiles, invalidSmiles } = useMemo(() => {
    if (!smilesInput.trim()) return { validSmiles: [], invalidSmiles: [] };

    const lines = smilesInput.split(/\n/);
    const allSmiles: string[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim()).filter(Boolean);
      allSmiles.push(...parts);
    }

    const valid: string[] = [];
    const invalid: string[] = [];

    for (const s of allSmiles) {
      try {
        if (isReactionSmiles(s)) {
          if (s.includes('>>')) {
            const steps = s.split('>>').filter((step) => step.trim().length > 0);
            if (steps.length < 2) throw new Error('Invalid reaction');
            for (const step of steps) {
              if (step.includes('>')) {
                // Daylight reaction step: Reactants>Products or Reactants>Agents>Products
                if (!parseReactionSmiles(step)) throw new Error('Invalid reaction step');
              } else {
                Molecule.fromSmiles(step);
              }
            }
          } else {
            if (!parseReactionSmiles(s)) throw new Error('Invalid reaction');
          }
        } else {
          Molecule.fromSmiles(s);
        }
        valid.push(s);
      } catch {
        invalid.push(s);
      }
    }

    return { validSmiles: valid, invalidSmiles: invalid };
  }, [smilesInput]);

  // Update molecules when SMILES input changes (on the fly with debounce)
  useEffect(() => {
    // Clear molecules immediately when input changes to prevent showing stale data
    if (!smilesInput.trim()) {
      useChemStore.setState({ molecules: [], substructureFilteredMolecules: [], filteredMolecules: [], loading: false });
      return;
    }

    const debounceTimer = setTimeout(() => {
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        return;
      }
      if (validSmiles.length > 0) {
        setMolecules(validSmiles);
      } else {
        // Clear molecules if no valid SMILES (either invalid or empty input)
        useChemStore.setState({ molecules: [], substructureFilteredMolecules: [], filteredMolecules: [], loading: false });
      }
    }, 500); // Reduced from 800ms for snappier response

    return () => {
      clearTimeout(debounceTimer);
      // Cancel loading state if debounce is cleared
      if (useChemStore.getState().loading) {
        useChemStore.setState({ loading: false });
      }
    };
  }, [validSmiles, smilesInput, setMolecules]);

  // Calculate properties after molecules are set
  useEffect(() => {
    // Only calculate if we have molecules without properties
    if (molecules.length > 0 && molecules.some(m => m.properties === null && m.mol !== null)) {
      // Use a small delay to batch rapid changes
      const calcTimer = setTimeout(() => {
        calculateProperties();
      }, 100);

      return () => clearTimeout(calcTimer);
    }
  }, [molecules, calculateProperties]);

  const handleSubstructureSearch = () => {
    if (substructureInput.trim()) {
      // Worker accepts SMILES or SMARTS (parses with SmilesParser smartsMode: 'guess' on failure)
      substructureSearch(substructureInput.trim());
    }
  };

  const handleClearSearch = () => {
    setSubstructureInput("");
    clearSubstructureSearch();
  };

  const handleRemoveDuplicates = useCallback((mode: DeduplicationMode) => {
    const { molecules } = useChemStore.getState();
    if (molecules.length < 2) return;
    const { deduplicated, removedCount } = deduplicateMolecules(molecules, mode);
    if (removedCount === 0) return;
    const previousSmiles = molecules.map((m) => m.smiles);
    const newSmiles = deduplicated.map((m) => m.smiles);
    skipNextPushRef.current = true;
    handleSmilesInputChange(newSmiles.join("\n"));
    setMolecules(newSmiles);
    toast.success(`${removedCount} duplicate${removedCount === 1 ? "" : "s"} removed`, {
      action: {
        label: "Undo",
        onClick: () => {
          skipNextPushRef.current = true;
          handleSmilesInputChange(previousSmiles.join("\n"));
          setMolecules(previousSmiles);
        },
      },
    });
  }, [handleSmilesInputChange, setMolecules]);

  // Ketcher handlers
  const handleDrawMolecule = () => {
    setKetcherMode("draw");
    setMoleculeToEdit(undefined);
    setShowKetcherDialog(true);
  };

  const handleSaveFromKetcher = (smiles: string, _molfile: string) => {
    void _molfile; // Ketcher passes molfile but we only use SMILES
    if (!smiles) return;

    if (ketcherMode === "draw") {
      // Add to existing molecules
      const currentSmiles = smilesInput ? `${smilesInput}\n${smiles}` : smiles;
      setSmilesInput(currentSmiles);
    } else {
      // Replace edited molecule - for now just add it
      const currentSmiles = smilesInput ? `${smilesInput}\n${smiles}` : smiles;
      setSmilesInput(currentSmiles);
    }
  };

  const sortOptionIcon = (key: string) => {
    const cn = "w-3.5 h-3.5 shrink-0 text-muted-foreground";
    switch (key) {
      case "input": return <ListOrdered className={cn} />;
      case "mw": return <Scale className={cn} />;
      case "logP": return <TestTube2 className={cn} />;
      case "tpsa": return <Crosshair className={cn} />;
      case "logS": return <Droplets className={cn} />;
      case "rotatableBonds": return <RotateCw className={cn} />;
      case "donorCount": return <Droplet className={cn} />;
      case "acceptorCount": return <Target className={cn} />;
      case "stereoCenterCount": return <Atom className={cn} />;
      default: return <ListOrdered className={cn} />;
    }
  };
  const sortOptionLabel: Record<string, string> = {
    input: "Input order",
    mw: "MW",
    logP: "LogP",
    tpsa: "TPSA",
    logS: "LogS",
    rotatableBonds: "Rot. bonds",
    donorCount: "HBD",
    acceptorCount: "HBA",
    stereoCenterCount: "Stereo",
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border/40 bg-background/95 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4">
          {/* Top Row - Branding & Quick Actions */}
          <div className="flex items-center justify-between h-14">
            {/* Left - Brand */}
            <div className="flex items-center gap-4">
              <div className="flex h-full min-h-14 items-center gap-1 text-lg ml-2">
                <AppLogo className="h-[1.25em] w-auto flex-shrink-0" aria-hidden />
                <h1 className="font-semibold tracking-tight leading-none">
                  <span className="sr-only">Depict</span>
                  <span aria-hidden>epict</span>
          </h1>
              </div>

              {/* Stats Badge - clickable to filter by type (hidden when no molecules) */}
              {molecules.length > 0 && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-muted/40 rounded-md border border-border/50">
                {/* Molecules - clickable filter */}
                {moleculeCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setTypeFilter((prev) => (prev === "molecules" ? "all" : "molecules"))}
                        className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 -my-0.5 transition-colors ${
                          typeFilter === "molecules"
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "hover:bg-muted border border-transparent"
                        }`}
                        aria-pressed={typeFilter === "molecules"}
                        aria-label={typeFilter === "molecules" ? "Show all (click to clear filter)" : "Show molecules only"}
                      >
                        <HexagonTwoTone style={{ transform: "rotate(90deg)", fontSize: "12px" }} className="text-muted-foreground shrink-0" />
                        <span className="text-xs font-sans font-medium">{moleculeCount.toLocaleString()}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {typeFilter === "molecules" ? "Show all" : "Show molecules only"}
                    </TooltipContent>
                  </Tooltip>
                )}

                {/* Divider if both exist */}
                {moleculeCount > 0 && reactionCount > 0 && (
                  <div className="w-px h-3 bg-border shrink-0" />
                )}

                {/* Reactions - clickable filter */}
                {reactionCount > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setTypeFilter((prev) => (prev === "reactions" ? "all" : "reactions"))}
                        className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 -my-0.5 transition-colors ${
                          typeFilter === "reactions"
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "hover:bg-muted border border-transparent"
                        }`}
                        aria-pressed={typeFilter === "reactions"}
                        aria-label={typeFilter === "reactions" ? "Show all (click to clear filter)" : "Show reactions only"}
                      >
                        <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
                        <span className="text-xs font-sans font-medium">{reactionCount.toLocaleString()}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {typeFilter === "reactions" ? "Show all" : "Show reactions only"}
                    </TooltipContent>
                  </Tooltip>
                )}
                {activeFilters.length > 0 && (
                  <>
                    <div className="w-px h-3 bg-border" />
                    <div className="flex items-center gap-1">
                      <Filter className="w-3 h-3 text-primary" />
                      <span className="text-xs text-primary font-medium">{activeFilters.length}</span>
                    </div>
                  </>
                )}
                {(filteredMolecules.length < molecules.length || typeFilter !== "all") && molecules.length > 0 && (
                  <>
                    <div className="w-px h-3 bg-border" />
                    <span className="text-xs font-sans text-muted-foreground font-medium">
                      {displayedMolecules.length.toLocaleString()} of {molecules.length.toLocaleString()}
                    </span>
                  </>
                )}
              </div>
              )}

              {/* Filter Chips: one line, first N visible then "+N more" dropdown */}
              {activeFilters.length > 0 && (
                <div className="flex items-center gap-1.5 flex-nowrap min-w-0 shrink">
                  {activeFilters.slice(0, visibleFilterCount).map((filter) => (
                    <div
                      key={filter.id}
                      className="group flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20 hover:bg-primary/15 transition-colors shrink-0"
                    >
                      <span className="text-xs font-medium">{filter.label}:</span>
                      <code className="text-xs font-mono max-w-[100px] truncate">{filter.value}</code>
                      <button
                        onClick={filter.onRemove}
                        className="opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {activeFilters.length > visibleFilterCount && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md border border-primary/20 bg-primary/10 text-primary text-xs font-medium hover:bg-primary/15 transition-colors shrink-0"
                        >
                          <span>+{activeFilters.length - visibleFilterCount} more</span>
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-[60vh] overflow-y-auto">
                        {activeFilters.slice(visibleFilterCount).map((filter) => (
                          <DropdownMenuItem
                            key={filter.id}
                            onSelect={(e) => {
                              e.preventDefault();
                              filter.onRemove();
                            }}
                            className="flex items-center justify-between gap-4 cursor-pointer"
                          >
                            <span className="text-xs font-medium">{filter.label}:</span>
                            <code className="text-xs font-mono truncate max-w-[140px]">{filter.value}</code>
                            <X className="w-3 h-3 shrink-0 opacity-60" />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              )}
            </div>

            {/* Right - Settings & Theme */}
            <div className="flex items-center gap-1">
              {!mdMatches ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDrawMolecule}
                      className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span className="hidden md:inline">Draw</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="text-xs">Draw molecule with Ketcher</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDrawMolecule}
                  className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Draw</span>
                </Button>
              )}

              <FileImportButton />

              {displayedMolecules.length > 0 && (() => {
                const filtersApplied = filteredMolecules.length < molecules.length || typeFilter !== "all";
                const listToExport = displayedMolecules;
                const exportButton = (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">
                      {filtersApplied ? `Export filtered (${displayedMolecules.length.toLocaleString()})` : "Export all"}
                    </span>
                  </Button>
                );
                return (
                  <>
                  <DropdownMenu>
                    {!mdMatches ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenuTrigger asChild>
                            {exportButton}
                          </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <span className="text-xs">
                            {filtersApplied ? `Export ${displayedMolecules.length.toLocaleString()} filtered` : "Export all molecules"}
                          </span>
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <DropdownMenuTrigger asChild>
                        {exportButton}
                      </DropdownMenuTrigger>
                    )}
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => exportAllAsSDF(listToExport)}>
                        <FileText className="w-3.5 h-3.5 mr-2 shrink-0" />
                        {filtersApplied ? "Export filtered as SDF" : "Export as SDF"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportAllAsSMI(listToExport)}>
                        <FileCode className="w-3.5 h-3.5 mr-2 shrink-0" />
                        {filtersApplied ? "Export filtered as SMI" : "Export as SMI"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportAllAsCSV(listToExport)}
                        title={`Columns: ${CSV_COLUMNS.map((c) => c.key).join(", ")}`}
                      >
                        <Table2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                        {filtersApplied ? "Export filtered as CSV" : "Export as CSV"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setCsvExportTarget({
                            molecules: listToExport,
                            filename: filtersApplied
                              ? `export_filtered_${new Date().getTime()}.csv`
                              : undefined,
                          });
                          setCsvExportDialogOpen(true);
                        }}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5 mr-2 shrink-0" />
                        {filtersApplied
                          ? "Export filtered as CSV (choose columns)"
                          : "Export as CSV (choose columns)"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={async () => {
                          const JSZip = (await import("jszip")).default;
                          const zip = new JSZip();
                          const w = 220;
                          const h = 160;
                          for (const m of listToExport) {
                            const svg = generateSVG(m.smiles, w, h, displayOptions, reactionArrowStyle);
                            if (svg) {
                              const name = generateFilenameFromSmiles(m.smiles, "svg");
                              zip.file(name, svg);
                            }
                          }
                          const blob = await zip.generateAsync({ type: "blob" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = `export_${new Date().getTime()}.zip`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                      >
                        <Image className="w-3.5 h-3.5 mr-2 shrink-0" aria-hidden />
                        {filtersApplied ? "Export filtered as SVG (ZIP)" : "Export as SVG (ZIP)"}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          const ok = openPrintView(listToExport, { displayOptions, reactionArrowStyle, showProperties: !hideProperties });
                          if (!ok) toast.error("Pop-up blocked. Allow pop-ups to open the print view.");
                        }}
                      >
                        <Printer className="w-3.5 h-3.5 mr-2 shrink-0" />
                        Print / Save as PDF
                      </DropdownMenuItem>
                      {filtersApplied && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => exportAllAsSDF(molecules)}
                            className="text-muted-foreground"
                          >
                            <FileText className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Export all as SDF ({molecules.length.toLocaleString()})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportAllAsSMI(molecules)}
                            className="text-muted-foreground"
                          >
                            <FileCode className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Export all as SMI ({molecules.length.toLocaleString()})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => exportAllAsCSV(molecules)}
                            title={`Columns: ${CSV_COLUMNS.map((c) => c.key).join(", ")}`}
                            className="text-muted-foreground"
                          >
                            <Table2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Export all as CSV ({molecules.length.toLocaleString()})
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setCsvExportTarget({
                                molecules,
                                filename: `export_all_${new Date().getTime()}.csv`,
                              });
                              setCsvExportDialogOpen(true);
                            }}
                            className="text-muted-foreground"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5 mr-2 shrink-0" />
                            Export all as CSV (choose columns)
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={async () => {
                              const JSZip = (await import("jszip")).default;
                              const zip = new JSZip();
                              const w = 220;
                              const h = 160;
                              for (const m of molecules) {
                                const svg = generateSVG(m.smiles, w, h, displayOptions, reactionArrowStyle);
                                if (svg) {
                                  const name = generateFilenameFromSmiles(m.smiles, "svg");
                                  zip.file(name, svg);
                                }
                              }
                              const blob = await zip.generateAsync({ type: "blob" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `export_all_${new Date().getTime()}.zip`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            className="text-muted-foreground"
                          >
                            <Image className="w-3.5 h-3.5 mr-2 shrink-0" aria-hidden />
                            Export all as SVG (ZIP) ({molecules.length.toLocaleString()})
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        onClick={() => {
                          const state: UrlFilterState = {
                            sortBy,
                            sortOrder,
                            substructureQuery,
                            mwMin: storeMwMin ?? null,
                            mwMax: storeMwMax ?? null,
                            logPMin: storeLogPMin ?? null,
                            logPMax: storeLogPMax ?? null,
                            logSMin: storeLogSMin ?? null,
                            logSMax: storeLogSMax ?? null,
                            tpsaMin: storeTpsaMin ?? null,
                            tpsaMax: storeTpsaMax ?? null,
                            rotatableBondsMin: storeRotatableBondsMin ?? null,
                            rotatableBondsMax: storeRotatableBondsMax ?? null,
                            donorCountMin: storeDonorCountMin ?? null,
                            donorCountMax: storeDonorCountMax ?? null,
                            acceptorCountMin: storeAcceptorCountMin ?? null,
                            acceptorCountMax: storeAcceptorCountMax ?? null,
                            stereoCenterCountMin: storeStereoCenterCountMin ?? null,
                            stereoCenterCountMax: storeStereoCenterCountMax ?? null,
                          };
                          const params = buildSearchParams(state);
                          const url = buildShareUrl(
                            typeof window !== "undefined" ? window.location.origin + pathname : "",
                            smilesInput,
                            params
                          );
                          if (!url) {
                            toast.error(
                              !smilesInput.trim()
                                ? "Nothing to share"
                                : "SMILES data too long for URL; try fewer molecules."
                            );
                            return;
                          }
                          navigator.clipboard.writeText(url);
                          toast.success("Share link copied to clipboard");
                        }}
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span className="hidden md:inline">Share</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="text-xs">Copy share link</span>
                    </TooltipContent>
                  </Tooltip>
                </>
                );
              })()}

              <div className="w-px h-4 bg-border/50" />

              {!smMatches ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInputExpanded(!inputExpanded)}
                      className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <motion.span
                        animate={{ rotate: inputExpanded ? 180 : 0 }}
                        transition={{ type: "spring", stiffness: 300, damping: 24 }}
                        className="inline-flex"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </motion.span>
                      <span className="hidden sm:inline">{inputExpanded ? 'Collapse' : 'Expand'}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <span className="text-xs">{inputExpanded ? "Collapse input area" : "Expand input area"}</span>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInputExpanded(!inputExpanded)}
                  className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <motion.span
                    animate={{ rotate: inputExpanded ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    className="inline-flex"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                  </motion.span>
                  <span className="hidden sm:inline">{inputExpanded ? 'Collapse' : 'Expand'}</span>
                </Button>
              )}

              <div className="w-px h-4 bg-border/50" />

              <ThemeSwitcher className="hidden sm:flex" />

              <Dialog open={showShortcutsHelp} onOpenChange={setShowShortcutsHelp}>
                <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Keyboard className="w-5 h-5" />
                      Keyboard shortcuts
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-1.5 py-2 text-sm">
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Undo SMILES input</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Z</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Redo SMILES input</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>Z</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Copy all SMILES</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>C</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Paste from clipboard</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>V</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Clear input</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>C</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Toggle display settings</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>D</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Toggle property filters</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>F</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Toggle property charts</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>B</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Expand/collapse input</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>E</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Open help page</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>H</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Clear selection</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>A</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Select molecule (toggle)</span>
                      <KbdGroup><Kbd>Ctrl</Kbd><span className="text-muted-foreground">+</span><Kbd>Click</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Select range</span>
                      <KbdGroup><Kbd>Shift</Kbd><span className="text-muted-foreground">+</span><Kbd>Click</Kbd></KbdGroup>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Close panel / dialog</span>
                      <Kbd>Esc</Kbd>
                    </div>
                    <div className="flex justify-between items-center gap-4 py-1">
                      <span className="text-muted-foreground">Show this dialog</span>
                      <Kbd>?</Kbd>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/40">
                    Use <Kbd>⌘</Kbd> on Mac instead of Ctrl. Shortcuts are disabled when typing in the SMILES input.
                  </p>
                </DialogContent>
              </Dialog>

              <Dialog open={showDisplaySettings} onOpenChange={setShowDisplaySettings}>
                {!lgMatches ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Display</span>
                        </Button>
                      </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="text-xs">Display settings and options</span>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Display</span>
                    </Button>
                  </DialogTrigger>
                )}
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Display Settings</DialogTitle>
                  </DialogHeader>
                  <DisplaySettings settings={displayOptions} onChange={setDisplayOptions} />

                  {/* UI Options */}
                  <div className="mt-6 pt-6 border-t border-border/40 space-y-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="hideActionButtons"
                        checked={hideActionButtons}
                        onCheckedChange={(checked) => setHideActionButtons(checked === true)}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="hideActionButtons" className="text-xs font-medium cursor-pointer">
                          Hide Action Buttons
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Hides Download SVG, PubChem, and other action buttons from molecule cards
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="hideProperties"
                        checked={hideProperties}
                        onCheckedChange={(checked) => setHideProperties(checked === true)}
                      />
                      <div className="grid gap-1.5">
                        <Label htmlFor="hideProperties" className="text-xs font-medium cursor-pointer">
                          Hide Properties
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Hides molecular weight, LogP, and other property values from molecule cards
                        </p>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Selection toolbar - in header so it stays visible when scrolling */}
          {selectedIds.size > 0 && displayedMolecules.length > 0 && (
            <div className="border-t border-border/30 py-2">
              <SelectionToolbar
                selectedMolecules={displayedMolecules.filter((m) => selectedIds.has(m.id))}
                allDisplayedCount={displayedMolecules.length}
                onSelectAll={() => {
                  setSelectedIds(new Set(displayedMolecules.map((m) => m.id)));
                }}
                onClearSelection={() => {
                  setSelectedIds(new Set());
                  setLastClickedIndex(null);
                }}
                onAddToComparator={(mols) => {
                  clearPinnedMolecules();
                  mols.slice(0, 2).forEach((m) => pinMolecule(m));
                  setSelectedIds(new Set());
                  setLastClickedIndex(null);
                  toast.success(mols.length >= 2 ? "Added 2 molecules to comparator" : "Added to comparator");
                }}
                onOpenCsvColumnPicker={(mols) => {
                  setCsvExportTarget({
                    molecules: mols,
                    filename: `export_selected_${new Date().getTime()}.csv`,
                  });
                  setCsvExportDialogOpen(true);
                }}
                displayOptions={displayOptions}
                reactionArrowStyle={reactionArrowStyle}
              />
            </div>
          )}

          {/* Collapsible Input Section */}
          {inputExpanded && (
            <div className="border-t border-border/40 py-3 space-y-3">
              {/* Main row: SMILES input (left) + controls in two rows (right) */}
              <div className="flex items-start gap-4">
                {/* SMILES Input */}
                <div className="flex-1 min-w-0 relative">
                  {/* Top-right controls - Always visible */}
                  <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                    {/* Validation badges: n valid (tick), m invalid (cross) */}
                    {smilesInput && (
                      <div className="flex items-center gap-1.5">
                        {validSmiles.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-500 font-sans bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20" title={`${validSmiles.length} valid SMILES`}>
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>{validSmiles.length}</span>
                          </div>
                        )}
                        {invalidSmiles.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="flex items-center gap-1 text-xs text-destructive font-sans bg-destructive/10 px-2 py-1 rounded border border-destructive/20 hover:bg-destructive/15 cursor-pointer transition-colors"
                                title={`${invalidSmiles.length} invalid SMILES`}
                              >
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                <span>{invalidSmiles.length}</span>
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(invalidSmiles.join("\n"));
                                  toast.success(`Copied ${invalidSmiles.length} invalid SMILES`);
                                }}
                              >
                                <Copy className="w-3.5 h-3.5 mr-2" />
                                Copy invalid SMILES
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )}

                    {/* Action buttons - Undo, Redo, Paste, Copy & Clear */}
                    <div className="flex items-center gap-0.5 ml-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40"
                            onClick={handleUndo}
                            disabled={!canUndo}
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span className="text-xs">Undo (Ctrl+Z)</span>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40"
                            onClick={handleRedo}
                            disabled={!canRedo}
                          >
                            <Redo2 className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span className="text-xs">Redo (Ctrl+Shift+Z)</span>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                if (text) {
                                  const newValue = smilesInput ? `${smilesInput}\n${text}` : text;
                                  handleSmilesInputChange(newValue);
                                }
                              } catch {
                                // Clipboard read failed
                              }
                            }}
                          >
                            <Clipboard className="w-3.5 h-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <span className="text-xs">Paste from clipboard</span>
                        </TooltipContent>
                      </Tooltip>

                      {smilesInput && (
                        <>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(smilesInput);
                                    setSmilesCopied(true);
                                    setTimeout(() => setSmilesCopied(false), 2000);
                                  } catch {
                                    // Copy failed
                                  }
                                }}
                              >
                                {smilesCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <span className="text-xs">{smilesCopied ? "Copied!" : "Copy all"}</span>
                            </TooltipContent>
                          </Tooltip>

                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60 disabled:opacity-40"
                                    disabled={molecules.length < 2}
                                  >
                                    <CopyMinus className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <span className="text-xs">Remove duplicates</span>
                              </TooltipContent>
                            </Tooltip>
                            <DropdownMenuContent align="end" className="min-w-[180px]">
                              <DropdownMenuItem onClick={() => handleRemoveDuplicates("canonical")}>
                                By canonical SMILES
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRemoveDuplicates("string")}>
                                By exact string
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                                onClick={handleClear}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              <span className="text-xs">Clear</span>
                            </TooltipContent>
                          </Tooltip>
                        </>
                      )}
                    </div>
                  </div>

                  <SmilesEditor
                    value={smilesInput}
                    onChange={handleSmilesInputChange}
                    placeholder="Paste SMILES here (comma or newline separated)..."
                    minHeight="80px"
                    maxHeight="300px"
                    invalidSmiles={invalidSmiles}
                    className={invalidSmiles.length > 0 ? "border-destructive/50" : ""}
                  />
                </div>

                {/* Right: two rows of controls */}
                <div className="flex flex-col gap-2 shrink-0">
                  {/* Row 1: Sort, Substructure search, Properties button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <Select
                          value={sortBy}
                          onValueChange={(v) => setSort(v as typeof sortBy)}
                        >
                          <SelectTrigger size="sm" className="min-w-[110px] text-xs font-sans">
                            <SelectValue placeholder="Sort">
                              <span className="flex items-center gap-2">
                                {sortOptionIcon(sortBy)}
                                {sortOptionLabel[sortBy] ?? "Sort"}
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent className="font-sans">
                            <SelectItem value="input" className="font-sans text-xs flex items-center gap-2">
                              <ListOrdered className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              Input order
                            </SelectItem>
                            <SelectItem value="mw" className="font-sans text-xs flex items-center gap-2">
                              <Scale className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              MW
                            </SelectItem>
                            <SelectItem value="logP" className="font-sans text-xs flex items-center gap-2">
                              <TestTube2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              LogP
                            </SelectItem>
                            <SelectItem value="tpsa" className="font-sans text-xs flex items-center gap-2">
                              <Crosshair className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              TPSA
                            </SelectItem>
                            <SelectItem value="logS" className="font-sans text-xs flex items-center gap-2">
                              <Droplets className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              LogS
                            </SelectItem>
                            <SelectItem value="rotatableBonds" className="font-sans text-xs flex items-center gap-2">
                              <RotateCw className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              Rot. bonds
                            </SelectItem>
                            <SelectItem value="donorCount" className="font-sans text-xs flex items-center gap-2">
                              <Droplet className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              HBD
                            </SelectItem>
                            <SelectItem value="acceptorCount" className="font-sans text-xs flex items-center gap-2">
                              <Target className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              HBA
                            </SelectItem>
                            <SelectItem value="stereoCenterCount" className="font-sans text-xs flex items-center gap-2">
                              <Atom className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                              Stereo
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 text-muted-foreground hover:text-foreground shrink-0 overflow-visible"
                              onClick={() => setSort(sortBy, sortOrder === "asc" ? "desc" : "asc")}
                            >
                              <motion.span
                                animate={{ rotate: sortOrder === "asc" ? 0 : -180 }}
                                transition={{ type: "spring", stiffness: 300, damping: 24 }}
                                className="inline-flex"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </motion.span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <span className="text-xs">{sortOrder === "asc" ? "Ascending" : "Descending"}</span>
                          </TooltipContent>
                        </Tooltip>
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <Input
                        type="text"
                        value={substructureInput}
                        onChange={(e) => setSubstructureInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSubstructureSearch();
                        }}
                        placeholder="Substructure search (SMILES or SMARTS)..."
                        aria-invalid={storeError != null && storeError.startsWith("Substructure search failed")}
                        className="h-8 w-36 text-xs font-mono bg-background/60 backdrop-blur-sm border-border/40 focus:bg-background focus:border-primary/40 focus:ring-1 focus:ring-primary/20 hover:border-border/60 hover:bg-background/80 shadow-none"
                      />
                    </div>
                    <Button
                      variant={substructureQuery || substructureError ? "default" : "outline"}
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-medium shrink-0"
                      onClick={substructureQuery || substructureError ? handleClearSearch : handleSubstructureSearch}
                      disabled={!substructureQuery && !substructureError && !substructureInput.trim()}
                    >
                      {substructureQuery || substructureError ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                      <span className="hidden md:inline">{substructureQuery || substructureError ? "Clear" : "Search"}</span>
                    </Button>
                  </div>
                  {/* Row 2: Properties, Charts */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant={showPropertyFilters ? "default" : "outline"}
                      size="sm"
                      className="h-9 px-3 gap-1.5 text-xs font-medium shrink-0"
                      onClick={() => setShowPropertyFilters(!showPropertyFilters)}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Properties</span>
                    </Button>
                    <Button
                      variant={showCharts ? "default" : "outline"}
                      size="sm"
                      className="h-9 px-3 gap-1.5 text-xs font-medium shrink-0"
                      onClick={() => setShowCharts(!showCharts)}
                    >
                      <BarChart3 className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">Charts</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Property Filters Row */}
              {showPropertyFilters && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 p-4 bg-background/60 backdrop-blur-sm border border-border/40 rounded-md shadow-sm">
                  {/* Header */}
                  <div className="col-span-full flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Property Filters</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearPropertyFilters}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear All
                    </Button>
                  </div>

                  {/* MW Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">MW</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={mwMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ mwMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={mwMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ mwMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* LogP Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">LogP</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={logPMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ logPMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" step="0.1" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={logPMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ logPMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" step="0.1" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* LogS Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">LogS</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={logSMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ logSMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" step="0.1" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={logSMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ logSMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" step="0.1" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* TPSA Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">TPSA</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={tpsaMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ tpsaMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={tpsaMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ tpsaMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* Rotatable Bonds Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">Rot. Bonds</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={rotatableBondsMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ rotatableBondsMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={rotatableBondsMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ rotatableBondsMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* H-Bond Donors Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">HB Donors</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={donorCountMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ donorCountMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={donorCountMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ donorCountMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* H-Bond Acceptors Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">HB Accept.</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={acceptorCountMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ acceptorCountMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={acceptorCountMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ acceptorCountMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>

                  {/* Stereo Centers Range */}
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-medium text-foreground/80 truncate">Stereo Ctr.</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={stereoCenterCountMin} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ stereoCenterCountMin: n === null || isNaN(n) ? null : n }); }} placeholder="Min" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                      <span className="text-[10px] text-muted-foreground/60">–</span>
                      <input type="number" value={stereoCenterCountMax} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); setPropertyFilters({ stereoCenterCountMax: n === null || isNaN(n) ? null : n }); }} placeholder="Max" className="w-16 h-7 px-1.5 text-[11px] font-mono bg-background/80 border border-border/40 rounded text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20" />
                    </div>
                  </div>
                </div>
              )}

              {/* Charts Row - compact, single line in header */}
              {showCharts && (
                <div className="flex items-center gap-2 py-2 px-3 bg-background/60 backdrop-blur-sm border border-border/40 rounded-md shadow-sm min-h-[120px] w-full">
                  <PropertyCharts
                    molecules={displayedMolecules}
                    hoveredMolecule={hoveredMolecule}
                    onMoleculeClick={(mol) => {
                      setSelectedMolecule(mol);
                      setShowMoleculeDetail(true);
                    }}
                    onFilterToBin={(payload) => {
                      if (payload.property === "mw") setPropertyFilters({ mwMin: payload.min, mwMax: payload.max });
                      if (payload.property === "logP") setPropertyFilters({ logPMin: payload.min, logPMax: payload.max });
                      if (payload.property === "tpsa") setPropertyFilters({ tpsaMin: payload.min, tpsaMax: payload.max });
                    }}
                    displayOptions={displayOptions}
                    reactionArrowStyle={reactionArrowStyle}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Generic store error banner (e.g. property calc failure) - not substructure errors */}
      {storeError != null && !storeError.startsWith("Substructure search failed") && (
        <div
          role="alert"
          className="flex items-center gap-3 px-4 py-2.5 bg-destructive/10 border-b border-destructive/20 text-destructive"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="text-sm flex-1">{storeError}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 hover:bg-destructive/20 text-destructive"
            onClick={() => useChemStore.setState({ error: null })}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col container mx-auto px-4 relative overflow-hidden">
        {loading && molecules.length > 0 && (
          <>
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-muted/50 border border-border/50 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span className="font-sans">
                  {loadingProgress
                    ? `Calculating… ${loadingProgress.current.toLocaleString()}/${loadingProgress.total.toLocaleString()}`
                    : "Calculating properties…"}
                </span>
              </div>
              <MoleculeGridSkeleton
                count={molecules.length}
                hideActionButtons={hideActionButtons}
                hideProperties={hideProperties}
              />
            </div>
          </>
        )}
        {loading && molecules.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Calculating properties…</p>
            </div>
          </div>
        )}

        {!loading && displayedMolecules.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <HexagonTwoTone style={{ transform: 'rotate(90deg)' }} />
                </EmptyMedia>
                <EmptyTitle>No Molecules to Display</EmptyTitle>
                <EmptyDescription>
                  {!smilesInput.trim()
                    ? "Get started by pasting SMILES strings in the input above, or click Import in the header to load CSV/SDF files."
                    : molecules.length === 0
                      ? "All entered SMILES appear to be invalid. Please check your input and try again."
                      : substructureQuery
                        ? "No molecule corresponds to the substructure search. Try a different SMILES or SMARTS pattern."
                        : "No molecule matches the current filters. Adjust property filters or type filter."}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                {!smilesInput && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        handleSmilesInputChange(SAMPLE_SMILES);
                        setInputExpanded(true);
                        toast.success("Sample molecules loaded");
                      }}
                      className="gap-1.5 text-muted-foreground hover:text-foreground h-auto py-1"
                    >
                      <TestTube2 className="w-3.5 h-3.5" />
                      Load sample
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text.trim()) {
                            handleSmilesInputChange(text.trim());
                            setInputExpanded(true);
                            toast.success("Pasted from clipboard");
                          } else {
                            toast.info("Clipboard is empty");
                          }
                        } catch {
                          toast.error("Could not read clipboard");
                        }
                      }}
                      className="gap-1.5 h-auto py-1"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      Paste SMILES
                    </Button>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                    <HexagonTwoTone style={{ transform: 'rotate(90deg)', fontSize: '14px' }} className="text-muted-foreground" />
                    <span className="text-muted-foreground">SMILES & Reaction SMILES</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                    <BarChart3 className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Property analysis</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-muted/40 border border-border/60 text-xs">
                    <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Substructure search</span>
                  </div>
                </div>
              </EmptyContent>
              {!smilesInput && !inputExpanded && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => setInputExpanded(true)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <span>Show input section</span>
                  <ChevronDown className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </Empty>
          </div>
        )}

        {!loading && displayedMolecules.length > 0 && (
          <div className="py-4 space-y-3">
            <MoleculeGrid
              className="h-full"
              molecules={displayedMolecules}
              displayOptions={displayOptions}
              hideActionButtons={hideActionButtons}
              hideProperties={hideProperties}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
              lastClickedIndex={lastClickedIndex}
              onLastClickedIndexChange={setLastClickedIndex}
              onMoleculeClick={(molecule) => {
                setSelectedMolecule(molecule);
                setShowMoleculeDetail(true);
              }}
              onMoleculeHover={setHoveredMolecule}
              onReorder={handleReorder}
            />
          </div>
        )}

        <CsvExportDialog
          open={csvExportDialogOpen}
          onOpenChange={(open) => {
            setCsvExportDialogOpen(open);
            if (!open) setCsvExportTarget(null);
          }}
          molecules={csvExportTarget?.molecules ?? []}
          filename={csvExportTarget?.filename}
        />

        <MoleculeDetailPanel
          molecule={selectedMolecule}
          open={showMoleculeDetail}
          onClose={() => setShowMoleculeDetail(false)}
          onEdit={(molecule) => {
            setMoleculeToEdit(molecule.smiles);
            setKetcherMode("edit");
            setShowKetcherDialog(true);
            setShowMoleculeDetail(false);
          }}
          displayOptions={displayOptions}
        />
      </main>

      {/* Footer */}
      <Footer onShortcutsClick={() => setShowShortcutsHelp(true)} />

      {/* Ketcher Panel */}
      <KetcherPanel
        open={showKetcherDialog}
        onClose={() => setShowKetcherDialog(false)}
        initialMolecule={moleculeToEdit}
        onSave={handleSaveFromKetcher}
        mode={ketcherMode}
      />

      {/* File Drop Zone */}
      <FileDropZone />
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="flex-shrink-0 border-b border-border/40 bg-background/95 h-14" />
      <main className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
