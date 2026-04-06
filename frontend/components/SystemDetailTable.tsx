"use client";

import React from "react";
import { motion } from "framer-motion";
import { Cpu, HardDrive, Network, Thermometer } from "lucide-react";
import { cn } from "@/lib/utils";

interface CpuInfo {
  name: string;
  usage: number;
  brand: string;
  frequency: number;
}

interface DiskInfo {
  name: string;
  mount_point: string;
  total_space: number;
  available_space: number;
  is_removable: boolean;
  file_system: string;
}

interface NetworkInfo {
  interface_name: string;
  received: number;
  transmitted: number;
  total_received: number;
  total_transmitted: number;
}

interface SensorInfo {
  label: string;
  temperature: number;
  max: number;
  critical: number | null;
}

interface Props {
  cpus: CpuInfo[];
  sensors: SensorInfo[];
  disks: DiskInfo[];
  networks: NetworkInfo[];
  onClose: () => void;
}

export default function SystemDetailTable({ cpus, sensors, disks, networks, onClose }: Props) {
  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-zinc-900/90 backdrop-blur-3xl border-l border-white/10 z-[100] shadow-2xl flex flex-col"
    >
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Cpu className="w-5 h-5 text-purple-400" />
          System Resources
        </h2>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-zinc-400">Esc</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
        {/* CPU Cores */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Cpu className="w-3 h-3" /> Core Breakdown
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {cpus.map((cpu, i) => (
              <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[10px] text-zinc-400 font-mono">Core {i}</span>
                  <span className="text-xs font-bold text-purple-400">{cpu.usage.toFixed(1)}%</span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${cpu.usage}%` }}
                    className="h-full bg-purple-500 rounded-full"
                  />
                </div>
                <div className="mt-1 text-[8px] text-zinc-500 font-mono text-right">{cpu.frequency} MHz</div>
              </div>
            ))}
          </div>
        </section>

        {/* Sensors / Temps */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Thermometer className="w-3 h-3" /> Thermal Sensors
          </h3>
          <div className="space-y-2">
            {sensors.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
                <span className="text-xs font-medium text-zinc-300">{s.label}</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-xs font-bold",
                    s.temperature > 80 ? "text-red-400" : s.temperature > 50 ? "text-amber-400" : "text-emerald-400"
                  )}>
                    {s.temperature.toFixed(1)}°C
                  </span>
                  <span className="text-[10px] text-zinc-600">Max: {s.max}°C</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Disks */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <HardDrive className="w-3 h-3" /> Disk Overview
          </h3>
          <div className="space-y-3">
            {disks.map((d, i) => {
              const used = d.total_space - d.available_space;
              const usedPercent = (used / d.total_space) * 100;
              return (
                <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-4">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-zinc-100">{d.name || 'Local Disk'}</span>
                    <span className="text-[10px] text-zinc-500">{d.file_system}</span>
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate mb-3">{d.mount_point}</div>
                  
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${usedPercent}%` }}
                      className={cn("h-full rounded-full", usedPercent > 90 ? "bg-red-500" : "bg-blue-500")}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                    <span>{(used / (1024**3)).toFixed(1)} GB used</span>
                    <span>{(d.total_space / (1024**3)).toFixed(1)} GB total</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Network */}
        <section>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Network className="w-3 h-3" /> Network Interfaces
          </h3>
          <div className="space-y-2">
            {networks.map((n, i) => (
              <div key={i} className="p-3 bg-white/5 rounded-2xl border border-white/5">
                <div className="flex justify-between mb-3">
                   <span className="text-xs font-bold text-blue-400">{n.interface_name}</span>
                   <div className="flex gap-2">
                      <span className="text-[10px] text-emerald-400">↓ {(n.received / 1024).toFixed(1)} KB/s</span>
                      <span className="text-[10px] text-amber-400">↑ {(n.transmitted / 1024).toFixed(1)} KB/s</span>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-[9px] font-mono text-zinc-600">
                  <div>Total Rx: {(n.total_received / (1024**2)).toFixed(1)} MB</div>
                  <div>Total Tx: {(n.total_transmitted / (1024**2)).toFixed(1)} MB</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </motion.div>
  );
}
