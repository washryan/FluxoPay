export const cardPresets = [
  {
    name: "Nubank",
    shortName: "Nu",
    closingDay: 20,
    dueDay: 27,
    surface: "bg-violet-800",
  },
  {
    name: "Caixa",
    shortName: "CX",
    closingDay: 18,
    dueDay: 25,
    surface: "bg-sky-800",
  },
  {
    name: "Inter",
    shortName: "IN",
    closingDay: 10,
    dueDay: 17,
    surface: "bg-orange-700",
  },
  {
    name: "Bradesco",
    shortName: "BR",
    closingDay: 12,
    dueDay: 20,
    surface: "bg-rose-800",
  },
  {
    name: "Itaú",
    shortName: "IT",
    closingDay: 8,
    dueDay: 15,
    surface: "bg-blue-800",
  },
  {
    name: "Santander",
    shortName: "ST",
    closingDay: 5,
    dueDay: 12,
    surface: "bg-red-800",
  },
  {
    name: "Banco do Brasil",
    shortName: "BB",
    closingDay: 14,
    dueDay: 21,
    surface: "bg-blue-700",
  },
  {
    name: "PicPay",
    shortName: "PP",
    closingDay: 22,
    dueDay: 1,
    surface: "bg-emerald-700",
  },
] as const;

export function getCardPreset(name: string) {
  return cardPresets.find(
    (preset) => preset.name.toLowerCase() === name.toLowerCase(),
  );
}
