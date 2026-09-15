export const onlyDigits10 = (v: string): string => (v || "").replace(/\D/g, "").slice(0, 10);

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
  { code: "MX", label: "México", shortLabel: "MX", dial: "+52" },
  { code: "US", label: "Estados Unidos", shortLabel: "US", dial: "+1" },
  { code: "CA", label: "Canadá", shortLabel: "CA", dial: "+1" },
] as const;

const getDialFromPhoneCountry = (code: string): string => {
  const match = phoneCountryOptions.find((c) => c.code === code);
  return match ? match.dial : "+52";
};

export const parsePhoneToForm = (raw: string | null | undefined): { phoneCountry: string; phoneNational: string } => {
  const s = String(raw || "").trim();
  // "USCA" es el valor heredado de antes de separar Estados Unidos y Canadá:
  // ambos comparten +1, así que un número existente no distingue cuál era.
  if (s.startsWith("+1")) return { phoneCountry: "US", phoneNational: onlyDigits10(s.slice(2)) };
  if (s.startsWith("+52")) return { phoneCountry: "MX", phoneNational: onlyDigits10(s.slice(3)) };
  return { phoneCountry: "MX", phoneNational: onlyDigits10(s) };
};

export const formatPhoneE164 = (phoneCountry: string, phoneNational: string): string => {
  const digits = onlyDigits10(phoneNational || "");
  if (!digits) return "";
  return `${getDialFromPhoneCountry(phoneCountry)}${digits}`;
};
