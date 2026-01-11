export type StoredProject = {
  id: string;
  name: string;
  clientName?: string;
  status: "in-progress" | "completed" | "cancelled";
  location: string;
  projectOwner?: string;
  deadline?: string;
  members?: number;
  raw?: any;
};

export type SelectedFile = {
  id: string;
  name: string;
  category?: string;
};

export type Tool =
  | "select"
  | "text"
  | "image"
  | "note"
  | "highlight"
  | "draw"
  | "eraser"
  | "rect"
  | "circle"
  | null;

export type PenColor = "black" | "red" | "blue" | "green" | "yellow";
export type PenSize = "small" | "medium" | "large";
