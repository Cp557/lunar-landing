"use client";

import { Download04Icon, EarthIcon, Sun03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { downloadCsv } from "../lib/csv";
import { formatDuration, formatLatLon, formatPercent, formatUtc } from "../lib/format";
import { GLOSSARY } from "../lib/glossary";
import type { BodyMetrics, Rating, Scenario } from "../lib/types";
import { InfoTip } from "./info-tip";

const RATING_STYLE: Record<Rating, { label: string; color: string }> = {
  good: { label: "Good", color: "var(--both)" },
  fair: { label: "Fair", color: "var(--sun)" },
  poor: { label: "Poor", color: "var(--destructive)" },
};

function RatingBadge({ rating }: { rating: Rating }) {
  const { label, color } = RATING_STYLE[rating];
  return (
    <Badge variant="outline" style={{ color, borderColor: color }}>
      {label}
    </Badge>
  );
}

function headline(m: BodyMetrics, names: { up: string; down: string; rises: string; sets: string }): string {
  if (m.up_at_start)
    return m.hours_until_change === null
      ? `${names.up} for the whole mission`
      : `${names.up} — ${names.sets} in ${formatDuration(m.hours_until_change)}`;
  return m.hours_until_change === null
    ? `${names.down} for the whole mission`
    : `${names.down} — ${names.rises} in ${formatDuration(m.hours_until_change)}`;
}

function Headline({
  label,
  tip,
  text,
  up,
  color,
  icon,
  rating,
  reason,
}: {
  label: string;
  tip: string;
  text: string;
  up: boolean;
  color: string;
  icon: typeof Sun03Icon;
  rating: Rating;
  reason: string;
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-2">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" style={{ color }} />
            {label}
            <InfoTip label={label} text={tip} />
          </span>
          <RatingBadge rating={rating} />
        </div>
        <p className="text-xl leading-snug font-semibold">{text}</p>
        <p className="text-xs text-muted-foreground">
          {up ? "Visible at landing. " : "Hidden at landing. "}
          {reason}
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, hint, tip }: { label: string; value: string; hint?: string; tip: string }) {
  return (
    <div className="rounded-3xl bg-card px-4 py-3 shadow-sm ring-1 ring-foreground/10">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        <InfoTip label={label} text={tip} />
      </div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** The answer to "how long will we have sunlight and contact with Earth?" for one scenario. */
export function Results({ scenario }: { scenario: Scenario }) {
  const { sun, earth, both_percent, solar_w_m2 } = scenario.metrics;
  const { brief } = scenario;
  const days = (scenario.end - scenario.start) / 86400;
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {scenario.site.name} ({formatLatLon(scenario.site.lat, scenario.site.lon)}) · landing {formatUtc(scenario.start)} ·{" "}
          {formatDuration(days * 24)} mission
        </p>
        <Button variant="ghost" size="sm" onClick={() => downloadCsv(scenario)}>
          <HugeiconsIcon icon={Download04Icon} strokeWidth={2} data-icon="inline-start" />
          Download CSV
        </Button>
      </div>
      <Card size="sm" className="bg-secondary">
        <CardContent className="grid gap-1">
          <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Mission brief
            <InfoTip label="the ratings" text={brief.rule} />
          </div>
          <p className="text-base leading-relaxed">{brief.summary}</p>
        </CardContent>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        <Headline
          label="Sunlight · power"
          tip={GLOSSARY.sunlight}
          icon={Sun03Icon}
          up={sun.up_at_start}
          color="var(--sun)"
          rating={brief.power.rating}
          reason={brief.power.reason}
          text={headline(sun, { up: "Sun is up", down: "Sun is down", rises: "sunrise", sets: "sunset" })}
        />
        <Headline
          label="Earth contact · comms"
          tip={GLOSSARY.earthContact}
          icon={EarthIcon}
          up={earth.up_at_start}
          color="var(--earth)"
          rating={brief.comms.rating}
          reason={brief.comms.reason}
          text={headline(earth, { up: "Earth in view", down: "Earth hidden", rises: "Earthrise", sets: "Earthset" })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sunlight" tip={GLOSSARY.sunlight} value={formatPercent(sun.visible_percent)} hint={formatDuration(sun.visible_hours)} />
        <Stat label="Longest darkness" tip={GLOSSARY.longestDark} value={formatDuration(sun.longest_hidden_hours)} />
        <Stat
          label="Earth contact"
          tip={GLOSSARY.earthContact}
          value={formatPercent(earth.visible_percent)}
          hint={formatDuration(earth.visible_hours)}
        />
        <Stat label="Longest blackout" tip={GLOSSARY.longestBlackout} value={formatDuration(earth.longest_hidden_hours)} />
        <Stat label="Both at once" tip={GLOSSARY.both} value={formatPercent(both_percent)} />
        <Stat
          label="Sun height at landing"
          tip={GLOSSARY.sunHeight}
          value={`${scenario.series.sun_el[0].toFixed(2)}°`}
          hint={`${sun.disk_percent_at_start.toFixed(0)}% of the Sun's disk visible`}
        />
        <Stat
          label="Upright solar panel"
          tip={GLOSSARY.verticalPanel}
          value={`${Math.round(solar_w_m2.vertical_avg)} W/m²`}
          hint="average sunlight on the panel"
        />
        <Stat
          label="Flat solar panel"
          tip={GLOSSARY.flatPanel}
          value={`${Math.round(solar_w_m2.horizontal_avg)} W/m²`}
          hint="average sunlight on the panel"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Terrain: {scenario.site.terrain} · site elevation {scenario.site_height_m.toFixed(0)} m vs 1737.4 km sphere · lander
        height {scenario.lander_height_m} m. &ldquo;Longest&rdquo; gaps are within this mission window.
      </p>
    </section>
  );
}
