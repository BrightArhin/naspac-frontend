export type EndorseBox = {
  x: number;
  y: number;
  width?: number;
  height?: number;
  size?: number;
};

export type EndorsePlacements = {
  date: EndorseBox;
  signature: EndorseBox;
  stamp: EndorseBox;
  company: EndorseBox;
  email: EndorseBox;
  phone1: EndorseBox;
  phone2: EndorseBox;
};

export const defaultEndorsePlacements: EndorsePlacements = {
  date: { x: 0.36, y: 0.52, size: 20 },
  signature: { x: 0.28, y: 0.58, width: 0.18, height: 0.1 },
  stamp: { x: 0.5, y: 0.58, width: 0.16, height: 0.12 },
  company: { x: 0.3, y: 0.46, size: 18 },
  email: { x: 0.3, y: 0.52, size: 16 },
  phone1: { x: 0.3, y: 0.56, size: 16 },
  phone2: { x: 0.3, y: 0.6, size: 16 },
};

export const reportingDateLabel = () =>
  new Date().toLocaleDateString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: '2-digit',
  });
