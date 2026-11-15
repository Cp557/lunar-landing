// Shapes returned by the FastAPI backend (see REFERENCE.md "API").

export type Site = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  group: "south_pole" | "historical" | "far_side";
  kind: string;
  note: string;
  source_title: string;
  source_url: string;
};

export type BodyMetrics = {
  up_at_start: boolean;
  hours_until_change: number | null;
  visible_hours: number;
  visible_percent: number;
  longest_hidden_hours: number;
  disk_percent_at_start: number;
};

export type Interval = [number, number]; // unix seconds

export type Scenario = {
  site: { id: string | null; name: string; lat: number; lon: number; terrain: string };
  start: number;
  end: number;
  step_seconds: number;
  lander_height_m: number;
  site_height_m: number;
  horizon: { azimuth_deg: number[]; elevation_deg: number[] };
  series: {
    t: number[];
    sun_az: number[];
    sun_el: number[];
    sun_disk: number[];
    earth_az: number[];
    earth_el: number[];
    earth_disk: number[];
    earth_lit: number[]; // illuminated fraction of Earth's disk (0 = new Earth, 1 = full)
  };
  intervals: { sun: Interval[]; earth: Interval[] };
  metrics: {
    sun: BodyMetrics;
    earth: BodyMetrics;
    both_percent: number;
    sun_elevation_at_start_deg: number;
    earth_elevation_at_start_deg: number;
    solar_w_m2: { vertical_avg: number; horizontal_avg: number };
  };
  brief: Brief;
};

export type Rating = "good" | "fair" | "poor";

export type Brief = {
  summary: string;
  power: { rating: Rating; reason: string };
  comms: { rating: Rating; reason: string };
  rule: string;
};

export type LandingWindow = {
  start: number;
  sun_percent: number;
  earth_percent: number;
  both_percent: number;
  longest_dark_hours: number;
  longest_blackout_hours: number;
  sun_up_at_start: boolean;
};

export type LandingWindows = { site: Scenario["site"]; days: number; windows: LandingWindow[] };

export type ScenarioQuery = {
  site?: string;
  lat?: number;
  lon?: number;
  start: string; // ISO 8601 UTC
  days: number;
};
