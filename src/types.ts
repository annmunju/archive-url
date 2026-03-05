export type ExtractedLink = {
  url: string;
  content: string;
};

export type ExtractedData = {
  title: string;
  description: string;
  content: string;
  contentHtmls: string[];
  links: ExtractedLink[];
};

export type StoredDocument = {
  id: number;
  url: string;
  title: string;
  description: string;
  content: string;
  summary: string;
  links: ExtractedLink[];
  created_at: string;
};
