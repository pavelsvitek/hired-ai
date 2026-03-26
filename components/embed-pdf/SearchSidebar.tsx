'use client';

import { MatchFlag, type SearchResult } from '@embedpdf/models';
import { useScrollCapability } from '@embedpdf/plugin-scroll/react';
import { useSearch } from '@embedpdf/plugin-search/react';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type HitLineProps = {
  hit: SearchResult;
  onClick: () => void;
  active: boolean;
};

function HitLine({ hit, onClick, active }: HitLineProps) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (active && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [active]);

  return (
    <button
      className={[
        'w-full rounded border p-2 text-left text-sm transition-colors',
        active
          ? 'border-blue-500 bg-blue-50 text-gray-900 dark:bg-blue-900/30 dark:text-gray-100'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
      ].join(' ')}
      onClick={onClick}
      ref={ref}
      type="button"
    >
      <span>
        {hit.context.truncatedLeft && '… '}
        {hit.context.before}
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {hit.context.match}
        </span>
        {hit.context.after}
        {hit.context.truncatedRight && ' …'}
      </span>
    </button>
  );
}

type SearchSidebarProps = {
  documentId: string;
  onClose?: () => void;
};

export function SearchSidebar({ documentId, onClose }: SearchSidebarProps) {
  const { state, provides } = useSearch(documentId);
  const { provides: scrollCapability } = useScrollCapability();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const scrollToItem = useCallback(
    (index: number) => {
      const item = state.results[index];
      if (!item) {
        return;
      }

      const minCoordinates = item.rects.reduce(
        (min, rect) => ({
          x: Math.min(min.x, rect.origin.x),
          y: Math.min(min.y, rect.origin.y),
        }),
        { x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY }
      );

      scrollCapability?.forDocument(documentId)?.scrollToPage({
        pageNumber: item.pageIndex + 1,
        pageCoordinates: minCoordinates,
        alignX: 50,
        alignY: 25,
      });
    },
    [documentId, scrollCapability, state.results]
  );

  useEffect(() => {
    if (state.query && !inputValue) {
      setInputValue(state.query);
    }
  }, [state.query, inputValue]);

  useEffect(() => {
    if (state.activeResultIndex !== undefined && state.activeResultIndex >= 0) {
      scrollToItem(state.activeResultIndex);
    }
  }, [state.activeResultIndex, scrollToItem]);

  const debouncedValue = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedValue !== state.query) {
      provides?.searchAllPages(debouncedValue);
    }
  }, [debouncedValue, provides, state.query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleFlagChange = (flag: MatchFlag, checked: boolean) => {
    if (checked) {
      provides?.setFlags([...state.flags, flag]);
    } else {
      provides?.setFlags(state.flags.filter((f) => f !== flag));
    }
  };

  const clearInput = () => {
    setInputValue('');
    inputRef.current?.focus();
  };

  const groupByPage = useCallback(
    (
      results: SearchResult[]
    ): Record<number, { hit: SearchResult; index: number }[]> => {
      const grouped: Record<number, { hit: SearchResult; index: number }[]> =
        {};
      results.forEach((hit, index) => {
        if (!grouped[hit.pageIndex]) {
          grouped[hit.pageIndex] = [];
        }
        grouped[hit.pageIndex].push({ hit, index });
      });
      return grouped;
    },
    []
  );

  const grouped = groupByPage(state.results);

  return (
    <aside className="flex h-full w-[280px] shrink-0 flex-col overflow-hidden border-gray-200 border-r bg-white dark:border-gray-700 dark:bg-gray-900">
      <div className="p-4">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            autoFocus
            className="w-full rounded-md border border-gray-300 bg-white py-1.5 pr-8 pl-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            onChange={handleInputChange}
            placeholder="Search in document…"
            ref={inputRef}
            type="text"
            value={inputValue}
          />
          {inputValue && (
            <button
              className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              onClick={clearInput}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2">
          <label className="inline-flex cursor-pointer select-none items-center gap-2 font-medium text-gray-700 text-xs dark:text-gray-300">
            <input
              checked={state.flags.includes(MatchFlag.MatchCase)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-500"
              onChange={(e) =>
                handleFlagChange(MatchFlag.MatchCase, e.target.checked)
              }
              type="checkbox"
            />
            Case sensitive
          </label>
          <label className="inline-flex cursor-pointer select-none items-center gap-2 font-medium text-gray-700 text-xs dark:text-gray-300">
            <input
              checked={state.flags.includes(MatchFlag.MatchWholeWord)}
              className="h-4 w-4 rounded border-gray-300 accent-blue-500"
              onChange={(e) =>
                handleFlagChange(MatchFlag.MatchWholeWord, e.target.checked)
              }
              type="checkbox"
            />
            Whole word
          </label>
        </div>

        <hr className="my-3 border-gray-200 dark:border-gray-700" />

        {state.active && (
          <div className="flex h-8 items-center justify-between">
            <span className="text-gray-500 text-xs dark:text-gray-400">
              {state.total === 0
                ? 'No results'
                : `${state.total} result${state.total === 1 ? '' : 's'} found`}
            </span>
            {state.total > 1 && (
              <div className="flex gap-1">
                <button
                  className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => provides?.previousResult()}
                  type="button"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  className="rounded p-1 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  onClick={() => provides?.nextResult()}
                  type="button"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {Object.entries(grouped).map(([page, hits]) => (
          <div className="mt-2 first:mt-0" key={page}>
            <div className="sticky top-0 bg-white/90 py-1.5 text-gray-500 text-xs backdrop-blur dark:bg-gray-900/90 dark:text-gray-400">
              Page {Number(page) + 1}
            </div>
            <div className="flex flex-col gap-1.5">
              {hits.map(({ hit, index }) => (
                <HitLine
                  active={index === state.activeResultIndex}
                  hit={hit}
                  key={index}
                  onClick={() => {
                    provides?.goToResult(index);
                  }}
                />
              ))}
            </div>
          </div>
        ))}
        <div />
      </div>
    </aside>
  );
}
