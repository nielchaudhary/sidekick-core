export type StreamHandlers = {
  onChunk: (text: string) => void;
  onStatus?: (status: string) => void;
};
