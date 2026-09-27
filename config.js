// 1) Paste your Supabase project values here (Project Settings -> API).
//    The anon key is safe to put in a public website: Row Level Security
//    in schema.sql makes sure each user can only see their own data.
window.FT_CONFIG = {
  SUPABASE_URL: "https://jpypdbtisosjyuvvovbv.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpweXBkYnRpc29zanl1dnZvdmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0ODg2MjEsImV4cCI6MjEwNjA2NDYyMX0.eam3hYLL-mDuoEoCxwv_ffZpBMFoF9nlTvbKb349D7A",

  // 2) Your daily targets. Change these any time.
  targets: {
    calories: 2200,   // max kcal per day
    protein: 130,     // grams per day
    fiber: 30,        // grams per day
    steps: 8000,
    sleep: 7,         // hours
    water: 3,         // litres
    gymDaysPerWeek: 4
  },

  // 3) Starting point (from your InBody scan, 24 Sep 2026)
  start: { date: "2026-09-24", weight: 95.8, bodyFatKg: 35.2, smmKg: 34.0, visceral: 17, goalWeight: 71.3 }
};
