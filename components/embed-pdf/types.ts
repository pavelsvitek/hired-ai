export type PDFTextSelection = {
  selectedText: string;
  pageIndex: number;
};

export type PDFScrollPosition = {
  pageIndex: number | null;
  ratioInPage: number;
};
