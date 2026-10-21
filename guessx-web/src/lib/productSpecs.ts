export const SPEC_FIELDS = [
  { key: "storage", label: "Storage" },
  { key: "ram", label: "RAM" },
  { key: "edition", label: "Edition" },
  { key: "battery", label: "Battery" },
  { key: "camera", label: "Camera" },
  { key: "osVersion", label: "OS Version" },
  { key: "display", label: "Display" },
  { key: "chipset", label: "Chipset" },
] as const;

export type SpecKey = typeof SPEC_FIELDS[number]["key"];

export const EMPTY_PRODUCT_SPECS: Record<SpecKey, string> = {
  storage: "",
  ram: "",
  edition: "",
  battery: "",
  camera: "",
  osVersion: "",
  display: "",
  chipset: "",
};
