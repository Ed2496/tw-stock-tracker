export interface SiteConfig {
  language: string;
  brandName: string;
  copyright: string;
}

export interface NavigationConfig {
  infoLinkLabel: string;
}

export interface ContactEntry {
  label: string;
  value: string;
  href?: string;
}

export interface InfoPageConfig {
  backLinkLabel: string;
  eyebrow: string;
  title: string;
  paragraphs: string[];
  contactLabel: string;
  contactEntries: ContactEntry[];
}

export interface OverlayConfig {
  frameDetailLabel: string;
  fileLabel: string;
  seriesLabel: string;
  closeLabel: string;
}

export interface ImageItem {
  src: string;
  category: string;
  title: string;
  description: string;
}

export interface GalleryConfig {
  images: ImageItem[];
}

export const siteConfig: SiteConfig = {
  language: "",
  brandName: "",
  copyright: "",
};

export const navigationConfig: NavigationConfig = {
  infoLinkLabel: "",
};

export const infoPageConfig: InfoPageConfig = {
  backLinkLabel: "",
  eyebrow: "",
  title: "",
  paragraphs: [],
  contactLabel: "",
  contactEntries: [],
};

export const overlayConfig: OverlayConfig = {
  frameDetailLabel: "",
  fileLabel: "",
  seriesLabel: "",
  closeLabel: "",
};

export const galleryConfig: GalleryConfig = {
  images: [],
};
