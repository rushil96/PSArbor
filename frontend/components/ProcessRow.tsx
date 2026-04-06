"use client";

import React, { useState, useMemo, memo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { 
  ChevronRight, 
  ChevronDown, 
  Info,
  Terminal,
  Lock,
  Unlock
} from "lucide-react";
import { cn } from "@/lib/utils";

// Lightweight SVG Sparkline
const Sparkline = memo(({ data, color, theme }: { data: number[], color: string, theme: 'dark' | 'light' }) => {
  if (!data || data.length < 2) return null;
  const isDark = theme === 'dark';
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const width = 64;
  const height = 32;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - padding * 2) - padding;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path 
        d={`M ${points}`} 
        fill="none" 
        stroke={color} 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d={`M ${points} V ${height} H 0 Z`} 
        fill={`url(#gradient-${color}-${theme})`} 
        fillOpacity={isDark ? "0.1" : "0.2"} 
      />
      <defs>
        <linearGradient id={`gradient-${color}-${theme}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
});

Sparkline.displayName = "Sparkline";

export interface ProcessInfo {
  pid: number;
  ppid: number | null;
  name: string;
  cpu_usage: number;
  memory_usage: number;
  status: string;
  user: string;
  thread_count: number;
  priority: number;
  children?: ProcessInfo[];
}

interface ProcessRowProps {
  proc: ProcessInfo;
  level: number;
  isTree: boolean;
  visibleColumns: string[];
  onInspect: (pid: number) => void;
  history?: { cpu: number[], mem: number[] };
  isWarning?: boolean;
  isNew?: boolean;
  theme: 'dark' | 'light';
  showGraphs: boolean;
}

const ProcessRow = memo(({ 
  proc, 
  level, 
  isTree, 
  visibleColumns, 
  onInspect,
  history,
  isWarning,
  isNew,
  theme,
  showGraphs
}: ProcessRowProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState(false);
  const [isProtected, setIsProtected] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('protected_procs');
    const names = saved ? JSON.parse(saved) : [];
    setIsProtected(names.includes(proc.name));
  }, [proc.name]);

  const isDark = theme === 'dark';
  const hasChildren = proc.children && proc.children.length > 0;

  const handleToggleProtect = (e: React.MouseEvent) => {
    e.stopPropagation();
    const saved = localStorage.getItem('protected_procs');
    let names = saved ? JSON.parse(saved) : [];
    if (isProtected) {
      names = names.filter((n: string = "") => n !== proc.name);
    } else {
      names.push(proc.name);
    }
    localStorage.setItem('protected_procs', JSON.stringify(names));
    setIsProtected(!isProtected);
  };

  const handlePriorityChange = async (newPrio: number) => {
     try {
        setIsUpdatingPriority(true);
        await invoke("set_process_priority", { pid: proc.pid, priority: newPrio });
     } catch (err) {
        alert(err);
     } finally {
        setIsUpdatingPriority(false);
     }
  };

  return (
    <>
      <motion.tr 
        layout
        initial={{ opacity: 0 }}
        animate={{ 
           opacity: 1,
           backgroundColor: isWarning 
            ? (isDark ? "rgba(249, 115, 22, 0.05)" : "rgba(249, 115, 22, 0.1)")
            : isProtected
              ? (isDark ? "rgba(59, 130, 246, 0.03)" : "rgba(59, 130, 246, 0.08)")
              : isNew 
                ? (isDark ? "rgba(34, 197, 94, 0.03)" : "rgba(34, 197, 94, 0.08)")
                : "rgba(0, 0, 0, 0)",
           borderColor: isWarning 
            ? "rgba(249, 115, 22, 0.3)" 
            : isProtected
              ? "rgba(59, 130, 246, 0.3)"
              : isNew 
                ? "rgba(34, 197, 94, 0.2)" 
                : (isDark ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)")
        }}
        transition={{ 
           layout: { type: "spring", damping: 25, stiffness: 120 },
           backgroundColor: { repeat: isWarning ? Infinity : 0, duration: 2, repeatType: "reverse" },
           borderColor: { repeat: isWarning ? Infinity : 0, duration: 2, repeatType: "reverse" }
        }}
        exit={{ opacity: 0 }}
        className={cn(
          "transition-colors group border-b relative",
          isDark ? "hover:bg-white/[0.04]" : "hover:bg-slate-50",
          proc.pid < 0 && (isDark ? "bg-white/[0.02]" : "bg-slate-50/50"), 
          isWarning && "shadow-[inset_0_0_15px_rgba(249,115,22,0.1)]",
          isProtected && "shadow-[inset_0_0_15px_rgba(59,130,246,0.05)]",
          isNew && "shadow-[inset_0_0_15px_rgba(34,197,94,0.05)]"
        )}
      >
        <td className={cn("px-6 py-3 font-mono text-xs", isDark ? "text-zinc-500" : "text-slate-400")}>
           <div className="flex items-center gap-2">
              <button 
                onClick={handleToggleProtect}
                title={isProtected ? "Unprotect Process" : "Protect Process"}
                className={cn("transition-colors", isProtected ? "text-blue-500" : "text-slate-400 opacity-0 group-hover:opacity-100 hover:text-blue-600")}
              >
                {isProtected ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
              {proc.pid < 0 ? <span className={cn("text-[10px] uppercase font-bold", isDark ? "text-zinc-600" : "text-slate-400")}>Grp</span> : proc.pid}
           </div>
        </td>
        
        <td className="px-6 py-3">
          <div className="flex items-center gap-3">
            {isTree && (
              <div style={{ marginLeft: `${level * 1.5}rem` }} className="flex items-center gap-1">
                {hasChildren ? (
                  <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className={cn("p-1 rounded transition-colors", isDark ? "hover:bg-white/10 text-zinc-500" : "hover:bg-slate-200 text-slate-400")}>
                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                ) : (
                  <div className="w-5" />
                )}
              </div>
            )}
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 shadow-sm",
              proc.pid < 0 
                ? "bg-purple-500/40 text-white" 
                : (isDark ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-300" : "bg-purple-100 text-purple-700 border border-purple-200")
            )}>
              {proc.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
               <span className={cn("font-bold text-sm truncate max-w-[240px] flex items-center gap-2", isDark ? "text-zinc-200" : "text-slate-900")}>
                  {proc.name}
                  {isNew && (
                    <span className="px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-600 text-[8px] font-bold uppercase tracking-tighter border border-emerald-500/20">New</span>
                  )}
               </span>
            </div>
          </div>
        </td>

        <td className="px-6 py-3">
          <div className="flex items-center gap-4 min-h-[32px]">
            <div className="flex-1 min-w-[60px]">
              <div className="flex justify-between mb-1">
                 <span className={cn("text-[10px] font-mono", isDark ? "text-zinc-500" : "text-slate-500")}>{proc.cpu_usage.toFixed(1)}%</span>
              </div>
              <div className={cn("h-1 rounded-full overflow-hidden", isDark ? "bg-zinc-800" : "bg-slate-200")}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(proc.cpu_usage, 100)}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    proc.cpu_usage > 50 ? "bg-red-500" : proc.cpu_usage > 20 ? "bg-amber-500" : (isDark ? "bg-purple-500" : "bg-purple-600")
                  )}
                />
              </div>
            </div>
            {showGraphs && history?.cpu && (
               <div className="w-16 h-8 opacity-80 flex items-center shrink-0 animate-in fade-in duration-300">
                  <Sparkline data={history.cpu} color={isDark ? "#a855f7" : "#7c3aed"} theme={theme} />
               </div>
            )}
          </div>
        </td>

        <td className="px-6 py-3">
           <div className="flex items-center gap-4 min-h-[32px]">
             <span className={cn("font-mono text-xs w-20 px-1 shrink-0", isDark ? "text-zinc-400" : "text-slate-600")}>{(proc.memory_usage / (1024 * 1024)).toFixed(1)} MB</span>
             {showGraphs && history?.mem && (
                <div className="w-16 h-8 opacity-80 flex items-center shrink-0 animate-in fade-in duration-300">
                   <Sparkline data={history.mem} color={isDark ? "#3b82f6" : "#2563eb"} theme={theme} />
                </div>
             )}
           </div>
        </td>

        {visibleColumns.includes('PPID') && (
          <td className={cn("px-6 py-3 font-mono text-xs", isDark ? "text-zinc-500" : "text-slate-500")}>{proc.ppid || '-'}</td>
        )}

        {visibleColumns.includes('Priority') && (
          <td className={cn("px-6 py-3 font-mono text-xs text-center", isDark ? "text-zinc-500" : "text-slate-500")}>{proc.priority}</td>
        )}

        {visibleColumns.includes('Threads') && (
          <td className={cn("px-6 py-3 text-xs font-mono text-center", isDark ? "text-zinc-500" : "text-slate-500")}>{proc.thread_count}</td>
        )}

        {visibleColumns.includes('Status') && (
          <td className="px-6 py-3">
            <span className={cn(
              "text-[9px] px-1.5 py-0.5 rounded-md border font-bold uppercase tracking-wider",
              proc.status.toLowerCase().includes('run') 
                ? (isDark ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-emerald-50 text-emerald-700 border-emerald-200") 
                : (isDark ? "bg-zinc-800 text-zinc-500 border-white/5" : "bg-slate-100 text-slate-500 border-slate-200")
            )}>
              {proc.status}
            </span>
          </td>
        )}

        {visibleColumns.includes('User') && (
          <td className={cn("px-6 py-3 text-[11px] font-medium truncate max-w-[100px]", isDark ? "text-zinc-500" : "text-slate-500")}>{proc.user}</td>
        )}

        <td className="px-6 py-3 text-right pr-6">
          <div className="flex items-center justify-end gap-1">
             <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex items-center rounded-lg p-0.5", isDark ? "bg-white/[0.03]" : "bg-slate-100")}>
                <button 
                  onClick={() => onInspect(proc.pid)}
                  title="Inspect Details"
                  className={cn("p-1.5 rounded-md transition-all", isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-200")}
                >
                  <Info className="w-3.5 h-3.5" />
                </button>
                <div className="relative group/prio">
                  <button className={cn("p-1.5 rounded-md transition-all", isDark ? "hover:bg-white/10 text-zinc-400 hover:text-white" : "hover:bg-white text-slate-500 hover:text-slate-900 shadow-sm border border-transparent hover:border-slate-200")}>
                    <Terminal className="w-3.5 h-3.5" />
                  </button>
                  <div className={cn(
                    "absolute right-full mr-2 top-[-8px] invisible group-hover/prio:visible opacity-0 group-hover/prio:opacity-100 transition-all border p-2 rounded-xl shadow-2xl z-[100] w-32",
                    isDark ? "bg-zinc-900 border-white/10" : "bg-white border-slate-200"
                  )}>
                    <p className={cn("text-[9px] font-bold uppercase mb-2 px-1", isDark ? "text-zinc-500" : "text-slate-400")}>Set Priority</p>
                    {[ -10, 0, 10 ].map(prio => (
                       <button 
                        key={prio}
                        onClick={() => handlePriorityChange(prio)}
                        className={cn("w-full text-left px-2 py-1.5 rounded-lg text-[10px] transition-colors", isDark ? "hover:bg-white/5 text-zinc-400 hover:text-white" : "hover:bg-slate-50 text-slate-600 hover:text-slate-900")}
                       >
                        {prio === 0 ? 'Normal (0)' : prio < 0 ? `High (${prio})` : `Low (${prio})`}
                       </button>
                    ))}
                  </div>
                </div>
             </div>
          </div>
        </td>
      </motion.tr>

      <AnimatePresence>
        {isExpanded && hasChildren && proc.children?.map(child => (
          <ProcessRow 
            key={child.pid} 
            proc={child} 
            level={level + 1} 
            isTree={isTree} 
            visibleColumns={visibleColumns} 
            onInspect={onInspect} 
            history={history}
            isWarning={isWarning}
            isNew={isNew}
            theme={theme}
            showGraphs={showGraphs}
          />
        ))}
      </AnimatePresence>
    </>
  );
});

ProcessRow.displayName = "ProcessRow";

export default ProcessRow;
