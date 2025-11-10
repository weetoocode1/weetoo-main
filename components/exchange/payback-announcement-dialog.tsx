"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, Sparkles } from "lucide-react";

const brokers = [
  {
    id: "binance",
    name: "Binance",
    logoImage: "/broker/Binance.png",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    glowColor: "shadow-yellow-500/20",
  },
  {
    id: "bybit",
    name: "Bybit",
    logoImage: "/broker/bybit.png",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    glowColor: "shadow-orange-500/20",
  },
  {
    id: "okx",
    name: "OKX",
    logoImage: "/broker/okx.png",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    glowColor: "shadow-red-500/20",
  },
  {
    id: "bitget",
    name: "Bitget",
    logoImage: "/broker/bitget.png",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    glowColor: "shadow-green-500/20",
  },
  {
    id: "gateio",
    name: "Gate.io",
    logoImage: "/broker/gate.png",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
  },
];

export function PaybackAnnouncementDialog() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasSeenDialog = localStorage.getItem("payback-announcement-seen");
    if (!hasSeenDialog) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem("payback-announcement-seen", "true");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />
      <div className="relative w-full max-w-3xl bg-linear-to-br from-zinc-950 via-zinc-900 to-zinc-950 rounded-2xl shadow-2xl overflow-hidden border border-border">
        <div className="absolute inset-0 bg-linear-to-br from-yellow-500/10 via-transparent to-red-500/10 pointer-events-none" />
        <div className="absolute top-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-transparent via-yellow-500/50 to-transparent" />

        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/50 transition-all hover:scale-110 hover:rotate-90"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4 text-zinc-300" />
        </button>

        <div className="grid grid-cols-12 gap-0">
          <div className="col-span-12 md:col-span-4 p-8 md:p-10 border-b md:border-b-0 md:border-r border-zinc-800/70 bg-linear-to-br from-zinc-900/60 via-zinc-900/40 to-transparent relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-2xl" />
            <div className="flex flex-col h-full relative z-10">
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-linear-to-r from-yellow-500/20 via-yellow-500/15 to-yellow-500/10 border border-yellow-500/40 mb-6 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">
                    Coming Soon
                  </span>
                </div>
                <div className="text-7xl font-black text-transparent leading-none mb-2 bg-linear-to-br from-white via-zinc-100 to-zinc-200 bg-clip-text">
                  25
                </div>
                <div className="text-xl text-zinc-300 font-semibold">
                  Dec 2025
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mt-auto">
                Registration opens sequentially for all supported exchanges.
              </p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-8 p-8 md:p-10">
            <h3 className="text-2xl font-bold mb-4 text-center bg-linear-to-r from-white to-zinc-200 bg-clip-text text-transparent">
              Payback Registration
            </h3>
            <p className="text-sm text-zinc-300 text-center leading-relaxed mb-8">
              Payback registration for{" "}
              <span className="font-bold text-white">
                Binance, Bybit, OKX, Bitget, and Gate.io
              </span>{" "}
              will open sequentially.
            </p>

            <div className="grid grid-cols-5 gap-4 mb-8">
              {brokers.map((broker) => (
                <div
                  key={broker.id}
                  className="flex flex-col items-center gap-2.5 group"
                >
                  <div
                    className={`w-16 h-16 rounded-full shrink-0 flex items-center justify-center overflow-hidden ${broker.bgColor} border-2 ${broker.borderColor} ${broker.glowColor} shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300`}
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden bg-linear-to-br from-zinc-900/90 to-zinc-800/70 border border-zinc-700/50 group-hover:border-zinc-600 transition-colors">
                      <Image
                        src={broker.logoImage}
                        alt={`${broker.name} logo`}
                        width={56}
                        height={56}
                        className="object-contain w-full h-full p-2 rounded-full group-hover:scale-110 transition-transform duration-300"
                        draggable={false}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-300 text-center group-hover:text-white transition-colors">
                    {broker.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-6 border-t border-zinc-800/70">
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-lg bg-linear-to-r from-zinc-800/90 to-zinc-800/70 hover:from-zinc-800 hover:to-zinc-700 border border-zinc-700/50 text-zinc-300 text-sm font-medium transition-all hover:border-zinc-600 hover:scale-[1.02]"
              >
                Don&apos;t show today
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-3 px-4 rounded-lg bg-linear-to-r from-white via-zinc-50 to-white hover:from-zinc-50 hover:via-white hover:to-zinc-50 text-zinc-900 text-sm font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
