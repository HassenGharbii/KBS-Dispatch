import {
  Building2,
  Warehouse,
  ParkingCircle,
  Server,
  Store,
  Factory,
  Home,
  Landmark,
  type LucideIcon,
} from "lucide-react";

export const SITE_ICONS: Record<string, LucideIcon> = {
  building: Building2,
  warehouse: Warehouse,
  parking: ParkingCircle,
  datacenter: Server,
  store: Store,
  factory: Factory,
  home: Home,
  landmark: Landmark,
};

export const SITE_ICON_LABELS: Record<string, string> = {
  building: "Bureau",
  warehouse: "Entrepôt",
  parking: "Parking",
  datacenter: "Data center",
  store: "Commerce",
  factory: "Usine",
  home: "Résidentiel",
  landmark: "Institution",
};

export function siteIconOrDefault(icon: string | null | undefined): LucideIcon {
  return (icon && SITE_ICONS[icon]) || SITE_ICONS.building;
}
