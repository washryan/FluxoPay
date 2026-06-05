export const cardPresets = [
  {
    name: "Nubank",
    shortName: "Nu",
    closingDay: 20,
    dueDay: 27,
    gradient: "from-violet-700 via-fuchsia-600 to-purple-500",
  },
  {
    name: "Caixa",
    shortName: "CX",
    closingDay: 18,
    dueDay: 25,
    gradient: "from-sky-700 via-blue-600 to-orange-400",
  },
  {
    name: "Inter",
    shortName: "IN",
    closingDay: 10,
    dueDay: 17,
    gradient: "from-orange-600 via-orange-500 to-amber-300",
  },
  {
    name: "Bradesco",
    shortName: "BR",
    closingDay: 12,
    dueDay: 20,
    gradient: "from-red-700 via-rose-600 to-pink-500",
  },
  {
    name: "Itaú",
    shortName: "IT",
    closingDay: 8,
    dueDay: 15,
    gradient: "from-orange-700 via-blue-700 to-indigo-600",
  },
  {
    name: "Santander",
    shortName: "ST",
    closingDay: 5,
    dueDay: 12,
    gradient: "from-red-700 via-red-500 to-orange-400",
  },
  {
    name: "Banco do Brasil",
    shortName: "BB",
    closingDay: 14,
    dueDay: 21,
    gradient: "from-yellow-400 via-blue-600 to-blue-800",
  },
  {
    name: "PicPay",
    shortName: "PP",
    closingDay: 22,
    dueDay: 1,
    gradient: "from-lime-500 via-green-500 to-emerald-700",
  },
] as const;

export function getCardPreset(name: string) {
  return cardPresets.find(
    (preset) => preset.name.toLowerCase() === name.toLowerCase(),
  );
}
