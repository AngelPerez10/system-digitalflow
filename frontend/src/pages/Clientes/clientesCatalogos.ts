export const onlyDigits10 = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 10);

export const giroOptions = ["Comercial", "Equipo Medico", "Industrial", "Por definir", "Restaurantero", "Servicios"] as const;
export const paisOptions = ["México", "Estados Unidos", "Canadá"] as const;

export const estadosMX = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Estado de México",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
] as const;

export const estadosUS = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "District of Columbia",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

export const estadosCA = [
  "Alberta",
  "British Columbia",
  "Manitoba",
  "New Brunswick",
  "Newfoundland and Labrador",
  "Northwest Territories",
  "Nova Scotia",
  "Nunavut",
  "Ontario",
  "Prince Edward Island",
  "Quebec",
  "Saskatchewan",
  "Yukon",
] as const;

export const estadosPorPais: Record<string, readonly string[]> = {
  "México": estadosMX,
  "Estados Unidos": estadosUS,
  "Canadá": estadosCA,
};

export const phoneCountryOptions = [
  { code: "MX", label: "México (+52)", dial: "+52" },
  { code: "USCA", label: "USA/Canadá (+1)", dial: "+1" },
] as const;

const getDialFromPhoneCountry = (code: string): string => {
  if (code === "USCA") return "+1";
  return "+52";
};

export const parsePhoneToForm = (raw: string | null | undefined): { phoneCountry: string; phoneNational: string } => {
  const s = String(raw || "").trim();
  if (s.startsWith("+1")) return { phoneCountry: "USCA", phoneNational: onlyDigits10(s.slice(2)) };
  if (s.startsWith("+52")) return { phoneCountry: "MX", phoneNational: onlyDigits10(s.slice(3)) };
  return { phoneCountry: "MX", phoneNational: onlyDigits10(s) };
};

export const formatPhoneE164 = (phoneCountry: string, phoneNational: string): string => {
  const digits = onlyDigits10(phoneNational || "");
  if (!digits) return "";
  return `${getDialFromPhoneCountry(phoneCountry)}${digits}`;
};
