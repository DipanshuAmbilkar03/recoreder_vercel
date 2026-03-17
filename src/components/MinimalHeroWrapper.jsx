"use client";

import dynamic from "next/dynamic";

const MinimalHero = dynamic(() => import("./MinimalHero"), { ssr: false });

export default function MinimalHeroWrapper() {
    return <MinimalHero />;
}
