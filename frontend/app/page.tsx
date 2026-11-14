import Image from "next/image";

import { Method } from "./components/method";
import { Navigator } from "./navigator";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-6 sm:px-6">
      <header className="flex items-center gap-4">
        <Image src="/wise-tortoise-logo.svg" alt="Wise Tortoise logo" width={56} height={56} priority />
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Lunar Landing Site Navigator</h1>
          <p className="text-muted">
            If we land here, on this date, how long will we have sunlight and contact with Earth?
          </p>
        </div>
      </header>
      <Navigator />
      <Method />
      <footer className="pt-4 text-xs text-muted">
        Team Wise Tortoise · NASA Space Apps 2026 · Ephemeris: JPL Horizons · Terrain: LRO LOLA
      </footer>
    </main>
  );
}
