import Image from "next/image";
import { HelloButton } from "./hello-button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <Image
        src="/wise-tortoise-logo.svg"
        alt="Wise Tortoise logo"
        width={160}
        height={160}
        priority
      />
      <h1 className="text-3xl font-semibold tracking-tight">Wise Tortoise</h1>
      <HelloButton />
    </main>
  );
}
