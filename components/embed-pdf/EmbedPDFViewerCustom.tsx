'use client';

import { cn } from '@/lib/utils';
import { createPluginRegistration } from '@embedpdf/core';
import { EmbedPDF } from '@embedpdf/core/react';
import { usePdfiumEngine } from '@embedpdf/engines/react';
import {
  DocumentContent,
  DocumentManagerPluginPackage,
  useActiveDocument,
  useDocumentManagerCapability,
} from '@embedpdf/plugin-document-manager/react';
import {
  GlobalPointerProvider,
  InteractionManagerPluginPackage,
  PagePointerProvider,
} from '@embedpdf/plugin-interaction-manager/react';
import { PanPluginPackage, usePanCapability } from '@embedpdf/plugin-pan/react';
import {
  RenderLayer,
  RenderPluginPackage,
} from '@embedpdf/plugin-render/react';
import {
  Scroller,
  ScrollPluginPackage,
  useScrollCapability,
} from '@embedpdf/plugin-scroll/react';
import {
  SearchLayer,
  SearchPluginPackage,
  useSearchCapability,
} from '@embedpdf/plugin-search/react';
import {
  SelectionLayer,
  SelectionPluginPackage,
  useSelectionCapability,
} from '@embedpdf/plugin-selection/react';
import {
  Viewport,
  ViewportPluginPackage,
} from '@embedpdf/plugin-viewport/react';
import {
  useZoom,
  useZoomCapability,
  ZoomMode,
  ZoomPluginPackage,
} from '@embedpdf/plugin-zoom/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronDown,
  CircleMinusIcon,
  CirclePlusIcon,
  Hand,
  Loader2,
  Maximize2,
  MousePointer2,
  Search,
} from 'lucide-react';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SearchSidebar } from './SearchSidebar';
import type {
  PDFScrollPosition,
  PDFTextSelection,
} from './types';

const DEBOUNCE_MS = 125;

/** True when `EmbedPDFPersistentProvider` has a live engine and children are inside `<EmbedPDF>`. */
const EmbedPdfEngineReadyContext = createContext(false);

export function useEmbedPdfEngineReady() {
  return useContext(EmbedPdfEngineReadyContext);
}

function registerPlugins(url: string) {
  return [
    createPluginRegistration(DocumentManagerPluginPackage, {
      initialDocuments: [{ url }],
    }),
    createPluginRegistration(InteractionManagerPluginPackage, {}),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage),
    createPluginRegistration(RenderPluginPackage),
    createPluginRegistration(SearchPluginPackage, {}),
    createPluginRegistration(SelectionPluginPackage, {}),
    createPluginRegistration(PanPluginPackage, {}),
    createPluginRegistration(ZoomPluginPackage, {}),
  ];
}

type PDFEventBridgeProps = {
  documentId: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  defaultScrollPosition?: PDFScrollPosition;
  scrollPosition?: PDFScrollPosition;
  onScrollPositionChanged?: (position: PDFScrollPosition) => void;
  onTextSelected?: (selection: PDFTextSelection | null) => void;
  highlightText?: string | null;
};

function PDFEventBridge({
  documentId,
  onLoadSuccess,
  onLoadError,
  defaultScrollPosition,
  scrollPosition,
  onScrollPositionChanged,
  onTextSelected,
  highlightText,
}: PDFEventBridgeProps) {
  const { provides: scrollCap } = useScrollCapability();
  const { provides: selCap } = useSelectionCapability();
  const { provides: searchCap } = useSearchCapability();
  const { provides: docManagerCap } = useDocumentManagerCapability();

  // Stable refs for callbacks to avoid stale closures
  const onLoadSuccessRef = useRef(onLoadSuccess);
  onLoadSuccessRef.current = onLoadSuccess;
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const onScrollPositionChangedRef = useRef(onScrollPositionChanged);
  onScrollPositionChangedRef.current = onScrollPositionChanged;
  const onTextSelectedRef = useRef(onTextSelected);
  onTextSelectedRef.current = onTextSelected;
  const defaultScrollPositionRef = useRef(defaultScrollPosition);
  defaultScrollPositionRef.current = defaultScrollPosition;

  // Mutable state — not React state to avoid re-renders
  const reportedLoad = useRef(false);
  const appliedDefault = useRef(false);
  const isExternalScroll = useRef(false);
  const isLayoutPending = useRef(true);
  const currentPageRef = useRef(1);
  const pendingScrollPositionRef = useRef<PDFScrollPosition | null>(null);
  const pendingHighlightTextRef = useRef<string | null>(null);

  // onLoadError — subscribe to document manager errors
  useEffect(() => {
    if (!(docManagerCap && documentId)) {
      return;
    }
    return docManagerCap.onDocumentError((event) => {
      if (event.documentId === documentId) {
        onLoadErrorRef.current?.(
          new Error(event.message || 'Failed to load PDF document')
        );
      }
    });
  }, [docManagerCap, documentId]);

  // onLoadSuccess, defaultScrollPosition, onScrollPositionChanged
  useEffect(() => {
    if (!(scrollCap && documentId)) {
      return;
    }

    const cleanups: (() => void)[] = [];

    cleanups.push(
      scrollCap.onLayoutReady((event) => {
        if (event.documentId !== documentId) {
          return;
        }

        if (!reportedLoad.current && event.totalPages > 0) {
          reportedLoad.current = true;
          onLoadSuccessRef.current?.(event.totalPages);
        }

        if (event.isInitial) {
          const defaultPos = defaultScrollPositionRef.current;
          if (
            !appliedDefault.current &&
            defaultPos !== null &&
            defaultPos !== undefined
          ) {
            appliedDefault.current = true;
            const scope = scrollCap.forDocument(documentId);
            const pageNumber = Math.max(
              1,
              Math.min((defaultPos.pageIndex ?? 0) + 1, event.totalPages)
            );
            if (defaultPos.ratioInPage > 0) {
              const layout = scope.getLayout();
              const item = layout.virtualItems.find((vi) =>
                vi.pageNumbers.includes(pageNumber)
              );
              const pageLayout = item?.pageLayouts.find(
                (pl) => pl.pageNumber === pageNumber
              );
              scope.scrollToPage({
                pageNumber,
                ...(pageLayout && {
                  pageCoordinates: {
                    x: 0,
                    y: defaultPos.ratioInPage * pageLayout.rotatedHeight,
                  },
                }),
                alignY: 0,
                behavior: 'instant',
              });
            } else {
              scope.scrollToPage({ pageNumber, behavior: 'instant' });
            }
          }

          setTimeout(() => {
            isLayoutPending.current = false;
          }, 200);
        }

        if (pendingScrollPositionRef.current) {
          applyScrollPosition(
            scrollCap,
            documentId,
            pendingScrollPositionRef.current,
            isExternalScroll
          );
          pendingScrollPositionRef.current = null;
        }

        if (pendingHighlightTextRef.current && searchCap) {
          const scope = searchCap.forDocument(documentId);
          scope.startSearch();
          scope.searchAllPages(pendingHighlightTextRef.current);
          pendingHighlightTextRef.current = null;
        }
      })
    );

    cleanups.push(
      scrollCap.onPageChange((event) => {
        if (event.documentId !== documentId) {
          return;
        }
        currentPageRef.current = event.pageNumber;
      })
    );

    let timer: ReturnType<typeof setTimeout> | null = null;
    cleanups.push(
      scrollCap.onScroll((event) => {
        if (event.documentId !== documentId) {
          return;
        }
        if (isLayoutPending.current || isExternalScroll.current) {
          return;
        }

        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          const { metrics } = event;
          const scope = scrollCap.forDocument(documentId);
          const layout = scope.getLayout();
          const currentPage = currentPageRef.current;
          const item = layout.virtualItems.find((vi) =>
            vi.pageNumbers.includes(currentPage)
          );

          let ratioInPage = 0;
          if (item) {
            const pageLayout = item.pageLayouts.find(
              (pl) => pl.pageNumber === currentPage
            );
            if (pageLayout && pageLayout.rotatedHeight > 0) {
              ratioInPage = Math.max(
                0,
                Math.min(
                  1,
                  (metrics.scrollOffset.y - item.offset - pageLayout.y) /
                  pageLayout.rotatedHeight
                )
              );
            }
          }

          onScrollPositionChangedRef.current?.({
            pageIndex: currentPage - 1,
            ratioInPage,
          });
        }, DEBOUNCE_MS);
      })
    );

    cleanups.push(() => {
      if (timer) {
        clearTimeout(timer);
      }
    });

    return () => {
      for (const cleanup of cleanups) {
        cleanup();
      }
    };
  }, [scrollCap, documentId, searchCap]);

  // onTextSelected — subscribe to selection changes
  useEffect(() => {
    if (!(selCap && documentId)) {
      return;
    }
    const scope = selCap.forDocument(documentId);
    return scope.onSelectionChange(async (selectionRange) => {
      if (!onTextSelectedRef.current) {
        return;
      }
      if (!selectionRange) {
        onTextSelectedRef.current(null);
        return;
      }
      const selections = scope.getFormattedSelection();
      if (selections.length === 0) {
        onTextSelectedRef.current(null);
        return;
      }
      const selectedText = await scope.getSelectedText().toPromise();
      onTextSelectedRef.current({
        selectedText: selectedText.join(' '),
        pageIndex: selections[0].pageIndex,
      });
    });
  }, [selCap, documentId]);

  // scrollPosition controlled prop — react to changes
  useEffect(() => {
    if (scrollPosition === null || scrollPosition === undefined) {
      return;
    }
    if (!scrollCap) {
      pendingScrollPositionRef.current = scrollPosition;
      return;
    }
    const totalPages = scrollCap.forDocument(documentId).getTotalPages();
    if (totalPages <= 0) {
      pendingScrollPositionRef.current = scrollPosition;
      return;
    }
    pendingScrollPositionRef.current = null;
    applyScrollPosition(
      scrollCap,
      documentId,
      scrollPosition,
      isExternalScroll
    );
  }, [scrollPosition, scrollCap, documentId]);

  // highlightText controlled prop
  useEffect(() => {
    if (!highlightText) {
      return;
    }
    if (!searchCap) {
      pendingHighlightTextRef.current = highlightText;
      return;
    }
    const totalPages = scrollCap?.forDocument(documentId).getTotalPages() ?? 0;
    if (totalPages <= 0) {
      pendingHighlightTextRef.current = highlightText;
      return;
    }
    pendingHighlightTextRef.current = null;
    const scope = searchCap.forDocument(documentId);
    scope.startSearch();
    scope.searchAllPages(highlightText);
    return () => {
      searchCap.forDocument(documentId)?.stopSearch();
    };
  }, [highlightText, searchCap, scrollCap, documentId]);

  return null;
}

function ZoomControls({
  documentId,
  onAutoZoomChange,
}: {
  documentId: string;
  onAutoZoomChange?: (enabled: boolean) => void;
}) {
  const { state, provides } = useZoom(documentId);
  const { provides: zoomCap } = useZoomCapability();
  const [inputValue, setInputValue] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  const zoomPercent = Math.round(state.currentZoomLevel * 100);

  useEffect(() => {
    setInputValue(zoomPercent.toString());
  }, [zoomPercent]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = Number.parseFloat(inputValue);
    if (!Number.isNaN(value) && value > 0) {
      provides?.requestZoom(value / 100);
      onAutoZoomChange?.(false);
    } else {
      setInputValue(zoomPercent.toString());
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value.replace(/[^0-9]/g, ''));
  };

  const handleBlur = () => {
    const value = Number.parseFloat(inputValue);
    if (!inputValue || Number.isNaN(value) || value <= 0) {
      setInputValue(zoomPercent.toString());
    }
  };

  const presets = zoomCap?.getPresets() ?? [];

  return (
    <div className="relative flex items-center gap-0.5 rounded-lg border border-border bg-muted/50 px-1.5 dark:bg-input/30 [&>*]:px-1.5 [&>*]:py-1.5">
      <form className="flex items-center" onSubmit={handleSubmit}>
        <input
          aria-label="Zoom level"
          className="h-5 w-10 rounded-md border-0 bg-transparent text-right text-foreground text-sm tabular-nums outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          inputMode="numeric"
          onBlur={handleBlur}
          onChange={handleInputChange}
          type="text"
          value={inputValue}
        />
        <span className="text-muted-foreground text-sm">%</span>
      </form>

      <div className="relative">
        <button
          className="rounded-md border border-transparent px-1.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={() => setShowPresets((p) => !p)}
          title="Zoom presets"
          type="button"
        >
          <ChevronDown size={14} />
        </button>

        {showPresets && (
          <div className="-translate-x-1/2 absolute top-full left-1/2 z-50 mt-1 min-w-[120px] overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md">
            {presets.map((preset) => (
              <button
                className="w-full px-3 py-1.5 text-left text-popover-foreground text-sm transition-colors hover:bg-muted hover:text-foreground"
                key={preset.name}
                onClick={() => {
                  provides?.requestZoom(preset.value);
                  onAutoZoomChange?.(preset.value === ZoomMode.FitWidth);
                  setShowPresets(false);
                }}
                type="button"
              >
                {preset.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        className="rounded-md border border-transparent p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => provides?.zoomOut()}
        title="Zoom out"
        type="button"
      >
        <CircleMinusIcon size={16} />
      </button>
      <button
        className="rounded-md border border-transparent p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        onClick={() => provides?.zoomIn()}
        title="Zoom in"
        type="button"
      >
        <CirclePlusIcon size={16} />
      </button>
    </div>
  );
}

function PanControlBridge({
  documentId,
  isPanning,
}: {
  documentId: string;
  isPanning: boolean;
}) {
  const { provides: panCap } = usePanCapability();

  useEffect(() => {
    if (!panCap) {
      return;
    }
    const scope = panCap.forDocument(documentId);
    if (isPanning) {
      scope.enablePan();
    } else {
      scope.disablePan();
    }
  }, [isPanning, panCap, documentId]);

  return null;
}

type ScrollCapabilityLike = NonNullable<
  ReturnType<typeof useScrollCapability>['provides']
>;

function applyScrollPosition(
  scrollCap: ScrollCapabilityLike,
  documentId: string,
  position: PDFScrollPosition,
  isExternalScroll: { current: boolean }
) {
  const scope = scrollCap.forDocument(documentId);
  const totalPages = scope.getTotalPages();
  if (totalPages <= 0) {
    return;
  }

  const pageIndex = position.pageIndex ?? 0;
  const pageNumber = Math.max(1, Math.min(pageIndex + 1, totalPages));

  isExternalScroll.current = true;

  if (position.ratioInPage > 0) {
    const layout = scope.getLayout();
    const item = layout.virtualItems.find((vi) =>
      vi.pageNumbers.includes(pageNumber)
    );
    const pageLayout = item?.pageLayouts.find(
      (pl) => pl.pageNumber === pageNumber
    );
    if (pageLayout) {
      scope.scrollToPage({
        pageNumber,
        pageCoordinates: {
          x: 0,
          y: position.ratioInPage * pageLayout.rotatedHeight,
        },
        alignY: 0,
      });
    } else {
      scope.scrollToPage({ pageNumber });
    }
  } else {
    scope.scrollToPage({ pageNumber });
  }

  setTimeout(() => {
    requestAnimationFrame(() => {
      isExternalScroll.current = false;
    });
  }, 100);
}

function useDevicePixelRatioChange(
  onChange: (dpr: number, prev: number) => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let prevDpr = window.devicePixelRatio;
    let cleanup: (() => void) | undefined;

    function arm() {
      cleanup?.();
      const mq = matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      const handler = () => {
        const newDpr = window.devicePixelRatio;
        onChangeRef.current(newDpr, prevDpr);
        prevDpr = newDpr;
        arm();
      };
      mq.addEventListener('change', handler);
      cleanup = () => mq.removeEventListener('change', handler);
    }

    arm();
    return () => cleanup?.();
  }, []);
}

function AutoZoomBridge({
  documentId,
  enabled,
}: {
  documentId: string;
  enabled: boolean;
}) {
  const { provides: zoomProvides } = useZoom(documentId);
  const { provides: scrollCap } = useScrollCapability();
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const zoomProvidesRef = useRef(zoomProvides);
  zoomProvidesRef.current = zoomProvides;

  // Re-apply zoom only when `enabled` toggles. Reads zoomProvides from a ref
  // so a new object reference from useZoom doesn't re-trigger this effect.
  useEffect(() => {
    const provides = zoomProvidesRef.current;
    if (!provides) {
      return;
    }
    provides.requestZoom(enabled ? ZoomMode.FitWidth : ZoomMode.Automatic);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // FitWidth must run after the first scroll layout exists; requesting zoom as
  // soon as `useZoom` exposes capabilities often runs too early (wrong default).
  useEffect(() => {
    if (!scrollCap) {
      return;
    }
    return scrollCap.onLayoutReady((event) => {
      if (event.documentId !== documentId || !event.isInitial) {
        return;
      }
      if (!enabledRef.current) {
        return;
      }
      const z = zoomProvidesRef.current;
      if (!z) {
        return;
      }
      z.requestZoom(ZoomMode.FitWidth);
      requestAnimationFrame(() => {
        if (enabledRef.current) {
          zoomProvidesRef.current?.requestZoom(ZoomMode.FitWidth);
        }
      });
    });
  }, [scrollCap, documentId]);

  useDevicePixelRatioChange((newDpr, prevDpr) => {
    if (!enabledRef.current) {
      return;
    }
    if (newDpr >= prevDpr) {
      return;
    }
    if (!zoomProvides) {
      return;
    }

    zoomProvides.requestZoom(ZoomMode.FitWidth);
  });

  return null;
}

type PDFViewerBodyProps = {
  documentId: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  defaultScrollPosition?: PDFScrollPosition;
  scrollPosition?: PDFScrollPosition;
  onScrollPositionChanged?: (position: PDFScrollPosition) => void;
  onTextSelected?: (selection: PDFTextSelection | null) => void;
  highlightText?: string | null;
};

function PDFViewerBody({
  documentId,
  onLoadSuccess,
  onLoadError,
  defaultScrollPosition,
  scrollPosition,
  onScrollPositionChanged,
  onTextSelected,
  highlightText,
}: PDFViewerBodyProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [isPanning, setIsPanning] = useState(true);
  const [autoZoom, setAutoZoom] = useState(true);

  return (
    <>
      <PDFEventBridge
        defaultScrollPosition={defaultScrollPosition}
        documentId={documentId}
        highlightText={highlightText}
        onLoadError={onLoadError}
        onLoadSuccess={onLoadSuccess}
        onScrollPositionChanged={onScrollPositionChanged}
        onTextSelected={onTextSelected}
        scrollPosition={scrollPosition}
      />
      <PanControlBridge documentId={documentId} isPanning={isPanning} />
      <AutoZoomBridge documentId={documentId} enabled={autoZoom} />

      {/* Toolbar */}
      <div className="flex shrink-0 items-center border-b border-border bg-background pl-1 pr-2 py-1">
        <ZoomControls documentId={documentId} onAutoZoomChange={setAutoZoom} />
        <button
          className={cn('ml-1 rounded-md p-1.5 transition-colors', {
            'bg-muted text-foreground': autoZoom,
            'text-muted-foreground hover:bg-muted hover:text-foreground':
              !autoZoom,
          })}
          onClick={() => setAutoZoom((prev) => !prev)}
          title={'Fit to width'}
          type="button"
        >
          <Maximize2 size={15} />
        </button>
        <div className="mx-2 h-6 w-px bg-border" />
        {/* Mode toggle: text-selection vs pan */}
        <div className="flex items-center gap-0.5">
          <button
            className={cn('rounded-md p-1.5 transition-colors', {
              'text-muted-foreground hover:bg-muted hover:text-foreground':
                isPanning,
              'bg-muted text-foreground': !isPanning,
            })}
            onClick={() => setIsPanning(false)}
            title="Text selection mode"
            type="button"
          >
            <MousePointer2 size={18} />
          </button>
          <button
            className={cn('rounded-md p-1.5 transition-colors', {
              'bg-muted text-foreground': isPanning,
              'text-muted-foreground hover:bg-muted hover:text-foreground':
                !isPanning,
            })}
            onClick={() => setIsPanning(true)}
            title="Pan mode"
            type="button"
          >
            <Hand size={18} />
          </button>
        </div>
        <div className="ml-auto">
          <button
            className={cn('rounded-md p-1.5 transition-colors', {
              'bg-muted text-foreground': showSearch,
              'text-muted-foreground hover:bg-muted hover:text-foreground':
                !showSearch,
            })}
            onClick={() => setShowSearch((prev) => !prev)}
            title="Search in document"
            type="button"
          >
            <Search size={20} />
          </button>
        </div>
      </div>
      <DocumentContent documentId={documentId}>
        {({ isLoaded }) =>
          isLoaded && (
            <div className="flex min-h-0 flex-1 bg-background">
              <div className="flex min-w-0 flex-1 flex-col">
                <Viewport
                  className="bg-muted"
                  documentId={documentId}
                >
                  <GlobalPointerProvider
                    documentId={documentId}
                    style={{ height: '100%' }}
                  >
                    <Scroller
                      documentId={documentId}
                      renderPage={({ width, height, pageIndex }) => (
                        <PagePointerProvider
                          documentId={documentId}
                          onDragStart={(e) => e.preventDefault()}
                          pageIndex={pageIndex}
                          style={{
                            width,
                            height,
                            position: 'relative',
                            userSelect: 'none',
                          }}
                        >
                          <RenderLayer
                            documentId={documentId}
                            pageIndex={pageIndex}
                          />
                          <SearchLayer
                            documentId={documentId}
                            pageIndex={pageIndex}
                            style={{ position: 'absolute', inset: 0 }}
                          />
                          <SelectionLayer
                            documentId={documentId}
                            pageIndex={pageIndex}
                          />
                        </PagePointerProvider>
                      )}
                    />
                  </GlobalPointerProvider>
                </Viewport>
              </div>

              <AnimatePresence initial={false}>
                {showSearch && (
                  <motion.div
                    animate={{ width: 280 }}
                    className="overflow-hidden"
                    exit={{ width: 0 }}
                    initial={{ width: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                  >
                    <SearchSidebar
                      documentId={documentId}
                      onClose={() => setShowSearch(false)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }
      </DocumentContent>
    </>
  );
}

type EmbedPDFViewerCustomProps = {
  url: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  defaultScrollPosition?: PDFScrollPosition;
  scrollPosition?: PDFScrollPosition;
  onScrollPositionChanged?: (position: PDFScrollPosition) => void;
  onTextSelected?: (selection: PDFTextSelection | null) => void;
  highlightText?: string | null;
};

export const EmbedPDFViewerCustom = ({
  url,
  onLoadSuccess,
  onLoadError,
  defaultScrollPosition,
  scrollPosition,
  onScrollPositionChanged,
  onTextSelected,
  highlightText,
}: EmbedPDFViewerCustomProps) => {
  const { engine, isLoading } = usePdfiumEngine();

  if (isLoading || !engine) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <div className="flex h-[400px] items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">Loading PDF Engine...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md border border-border bg-background">
      <EmbedPDF engine={engine} plugins={registerPlugins(url)}>
        {({ activeDocumentId }) =>
          activeDocumentId && (
            <PDFViewerBody
              defaultScrollPosition={defaultScrollPosition}
              documentId={activeDocumentId}
              highlightText={highlightText}
              onLoadError={onLoadError}
              onLoadSuccess={onLoadSuccess}
              onScrollPositionChanged={onScrollPositionChanged}
              onTextSelected={onTextSelected}
              scrollPosition={scrollPosition}
            />
          )
        }
      </EmbedPDF>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Persistent provider + managed viewer
//
// EmbedPDFPersistentProvider keeps the EmbedPDF engine and document manager
// alive across dialog open/close cycles. Documents that have been parsed stay
// in memory — reopening calls setActiveDocument() instead of re-fetching and
// re-parsing the PDF.
//
// EmbedPDFManagedViewer renders inside the dialog and uses the persistent
// document manager to open or activate documents by ID.
// ---------------------------------------------------------------------------

function createPersistentPlugins() {
  return [
    createPluginRegistration(DocumentManagerPluginPackage, {}),
    createPluginRegistration(InteractionManagerPluginPackage, {}),
    createPluginRegistration(ViewportPluginPackage),
    createPluginRegistration(ScrollPluginPackage),
    createPluginRegistration(RenderPluginPackage),
    createPluginRegistration(SearchPluginPackage, {}),
    createPluginRegistration(SelectionPluginPackage, {}),
    createPluginRegistration(PanPluginPackage, {}),
    createPluginRegistration(ZoomPluginPackage, {}),
  ];
}

export function EmbedPDFPersistentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { engine, isLoading } = usePdfiumEngine();
  const plugins = useMemo(() => createPersistentPlugins(), []);
  const ready = !isLoading && !!engine;

  return (
    <EmbedPdfEngineReadyContext.Provider value={ready}>
      {ready ? (
        <EmbedPDF
          engine={engine}
          plugins={plugins}
          // AutoMount adds full-width plugin nodes as siblings of layout children and breaks flex height.
          autoMountDomElements={false}
        >
          {children}
        </EmbedPDF>
      ) : (
        children
      )}
    </EmbedPdfEngineReadyContext.Provider>
  );
}

function PDFDocumentOpener({
  documentId,
  url,
}: {
  documentId: string;
  url: string;
}) {
  const { provides: docManager } = useDocumentManagerCapability();

  useEffect(() => {
    if (!docManager) {
      return;
    }

    if (docManager.isDocumentOpen(documentId)) {
      docManager.setActiveDocument(documentId);
      return;
    }

    docManager.openDocumentUrl({ url, documentId });
  }, [docManager, url, documentId]);

  return null;
}

type EmbedPDFManagedViewerProps = {
  documentId: string;
  url: string;
  onLoadSuccess?: (numPages: number) => void;
  onLoadError?: (error: Error) => void;
  defaultScrollPosition?: PDFScrollPosition;
  scrollPosition?: PDFScrollPosition;
  onScrollPositionChanged?: (position: PDFScrollPosition) => void;
  onTextSelected?: (selection: PDFTextSelection | null) => void;
  highlightText?: string | null;
};

export function EmbedPDFManagedViewer({
  documentId: requestedDocumentId,
  url,
  onLoadSuccess,
  onLoadError,
  defaultScrollPosition,
  scrollPosition,
  onScrollPositionChanged,
  onTextSelected,
  highlightText,
}: EmbedPDFManagedViewerProps) {
  const { activeDocumentId } = useActiveDocument();

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <PDFDocumentOpener documentId={requestedDocumentId} url={url} />
      {activeDocumentId ? (
        <PDFViewerBody
          defaultScrollPosition={defaultScrollPosition}
          documentId={activeDocumentId}
          highlightText={highlightText}
          onLoadError={onLoadError}
          onLoadSuccess={onLoadSuccess}
          onScrollPositionChanged={onScrollPositionChanged}
          onTextSelected={onTextSelected}
          scrollPosition={scrollPosition}
        />
      ) : (
        <div className="flex h-full items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="animate-spin" size={20} />
            <span className="text-sm">Loading PDF...</span>
          </div>
        </div>
      )}
    </div>
  );
}
