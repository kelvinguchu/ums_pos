export const KENYA_COUNTIES = [
  "Baringo", "Bomet", "Bungoma", "Busia", "Elgeyo Marakwet", 
  "Embu", "Garissa", "Homa Bay", "Isiolo", "Kajiado", 
  "Kakamega", "Kericho", "Kiambu", "Kilifi", "Kirinyaga", 
  "Kisii", "Kisumu", "Kitui", "Kwale", "Laikipia", 
  "Lamu", "Machakos", "Makueni", "Mandera", "Marsabit", 
  "Meru", "Migori", "Mombasa", "Murang'a", "Nairobi", 
  "Nakuru", "Nandi", "Narok", "Nyamira", "Nyandarua", 
  "Nyeri", "Samburu", "Siaya", "Taita Taveta", "Tana River", 
  "Tharaka Nithi", "Trans Nzoia", "Turkana", "Uasin Gishu", 
  "Vihiga", "Wajir", "West Pokot"
] as const;

export const CUSTOMER_TYPES = [
  "walk in",
  "agent",
  "technician",
  "referal"
] as const;

export type KenyaCounty = typeof KENYA_COUNTIES[number];
export type CustomerType = typeof CUSTOMER_TYPES[number]; 