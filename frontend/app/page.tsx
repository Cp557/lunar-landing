import { Method } from "./components/method";
import { Navigator } from "./navigator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lunar Landing Site Navigator</h1>
        <p className="text-muted-foreground">If we land here, on this date, how long will we have sunlight and contact with Earth?</p>
      </header>
      <Navigator />
      <Method />
      <footer className="pt-2 text-xs text-muted-foreground">
        Team Wise Tortoise · NASA Space Apps 2026 · Ephemeris: JPL Horizons · Terrain: LRO LOLA · Icon: SVG Repo (CC0)
      </footer>
    </main>
  );
}
