export const meterTypeConfig = {
  integrated: {
    colors: ["#4F46E5", "#818CF8"], // Indigo
    bgColor: "bg-indigo-100",
  },
  split: {
    colors: ["#0EA5E9", "#38BDF8"], // Sky blue
    bgColor: "bg-sky-100",
  },
  gas: {
    colors: ["#059669", "#34D399"], // Emerald
    bgColor: "bg-emerald-100",
  },
  water: {
    colors: ["#2563EB", "#60A5FA"], // Blue
    bgColor: "bg-blue-100",
  },
  smart: {
    colors: ["#7C3AED", "#A78BFA"], // Violet
    bgColor: "bg-violet-100",
  },
  "3 phase": {
    colors: ["#DC2626", "#F87171"], // Red
    bgColor: "bg-red-100",
  },
};

export const getMeterTypeBadgeClass = (type: string) => {
  const config = meterTypeConfig[type.toLowerCase() as keyof typeof meterTypeConfig];
  return config ? config.bgColor : "bg-gray-100";
}; 