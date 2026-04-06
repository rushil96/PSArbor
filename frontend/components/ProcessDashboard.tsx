"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Cpu, Database, Terminal, ArrowUp, ArrowDown, Command as CmdIcon, Moon, Sun, LayoutGrid, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ProcessRow, { ProcessInfo } from "./ProcessRow";
import MenuBar from "./MenuBar";
import ProcessDetailPanel from "./ProcessDetailPanel";
import SystemDetailTable from "./SystemDetailTable";

type SortConfig = { key: keyof ProcessInfo; direction: 'asc' | 'desc' } | null;

export default function ProcessDashboard() {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [procHistory, setProcHistory] = useState<Record<number, { cpu: number[], mem: number[] }>>({});
  const [users, setUsers] = useState<{ uid: string, name: string }[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'tree' | 'group'>('list');
  const [selectedUser, setSelectedUser] = useState('all');
  const [visibleColumns, setVisibleColumns] = useState(['Threads', 'Status', 'User']);
  const [inspectingPid, setInspectingPid] = useState<number | null>(null);
  const [history, setHistory] = useState<{ time: string; cpu: number; mem: number }[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'cpu_usage', direction: 'desc' });
  
  // Hydration-safe states
  const [isMounted, setIsMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showGraphs, setShowGraphs] = useState(true);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showSystemDetails, setShowSystemDetails] = useState(false);

  const [cpus, setCpus] = useState<any[]>([]);
  const [sensors, setSensors] = useState<any[]>([]);
  const [disks, setDisks] = useState<any[]>([]);
  const [networks, setNetworks] = useState<any[]>([]);

  const fetchInitialData = async () => {
    try {
      const usersData: any[] = await invoke("get_system_users");
      setUsers(usersData);
      await fetchProcesses();
      await fetchExtendedStats();
    } catch (err) { console.error(err); }
  };

  const fetchExtendedStats = async () => {
    try {
      const [cpuStats, sensorStats]: [any[], any[]] = await invoke("get_system_stats");
      const [diskStats, networkStats]: [any[], any[]] = await invoke("get_hardware_info");
      setCpus(cpuStats);
      setSensors(sensorStats);
      setDisks(diskStats);
      setNetworks(networkStats);
    } catch (err) { console.error("Hardware fetch failed", err); }
  };

  const [warningPids, setWarningPids] = useState<Set<number>>(new Set());
  const highUsageTimers = useRef<Map<number, number>>(new Map());
  const [snapshotPids, setSnapshotPids] = useState<Set<number> | null>(null);
  const [focusedPid, setFocusedPid] = useState<number | null>(null);

  const fetchProcesses = async () => {
    try {
      const data: ProcessInfo[] = await invoke("get_processes");
      setProcesses(data);
      
      const now = Date.now();
      const newWarningPids = new Set<number>();
      
      data.forEach(p => {
        if (p.cpu_usage > 80) {
          if (!highUsageTimers.current.has(p.pid)) {
            highUsageTimers.current.set(p.pid, now);
          } else {
            const startTime = highUsageTimers.current.get(p.pid)!;
            if (now - startTime > 30000) {
               newWarningPids.add(p.pid);
            }
          }
        } else {
          highUsageTimers.current.delete(p.pid);
        }
      });
      setWarningPids(newWarningPids);
      
      const totalCpu = data.reduce((acc, p) => acc + p.cpu_usage, 0);
      const totalMem = data.reduce((acc, p) => acc + p.memory_usage, 0) / (1024 * 1024);
      setHistory(prev => [...prev, { time: new Date().toLocaleTimeString(), cpu: totalCpu, mem: totalMem }].slice(-40));

      setProcHistory(prev => {
        const next = { ...prev };
        data.forEach(p => {
          const h = next[p.pid] || { cpu: [], mem: [] };
          next[p.pid] = {
            cpu: [...h.cpu, p.cpu_usage].slice(-10),
            mem: [...h.mem, p.memory_usage].slice(-10)
          };
        });
        const currentPids = new Set(data.map(p => p.pid));
        Object.keys(next).forEach(pid => {
          if (!currentPids.has(Number(pid))) delete next[Number(pid)];
        });
        return next;
      });

      setLoading(false);
    } catch (err) { console.error(err); }
  };

  // Initial client mount
  useEffect(() => {
    setIsMounted(true);
    const savedTheme = localStorage.getItem('ps_theme') as 'dark' | 'light';
    if (savedTheme) setTheme(savedTheme);
    const savedGraphs = localStorage.getItem('ps_show_graphs');
    if (savedGraphs !== null) setShowGraphs(savedGraphs === 'true');
    
    fetchInitialData();
  }, []);

  // Persist settings after mount
  useEffect(() => {
    if (isMounted) localStorage.setItem('ps_theme', theme);
  }, [theme, isMounted]);

  useEffect(() => {
    if (isMounted) localStorage.setItem('ps_show_graphs', String(showGraphs));
  }, [showGraphs, isMounted]);

  const handleTakeSnapshot = () => setSnapshotPids(new Set(processes.map(p => p.pid)));

  const handleExportCSV = () => {
    const headers = ["PID", "Name", "CPU %", "Mem %", "User", "Threads", "Status"];
    const rows = processes.map(p => [p.pid, p.name, p.cpu_usage.toFixed(1), p.memory_usage.toFixed(1), p.user, p.thread_count, p.status]);
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `ps_dashboard_export_${new Date().getTime()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsPaletteOpen(prev => !prev); }
      if (e.key === 'Escape') { setIsPaletteOpen(false); setShowSystemDetails(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isPaused || !isMounted) return;
    const interval = setInterval(() => { fetchProcesses(); fetchExtendedStats(); }, 10000);
    return () => clearInterval(interval);
  }, [isPaused, isMounted]);

  const handleInspect = useCallback((pid: number) => setInspectingPid(pid), []);

  const inspectingProcessName = useMemo(() => processes.find(p => p.pid === inspectingPid)?.name, [processes, inspectingPid]);

  const buildTree = useCallback((procs: ProcessInfo[]): ProcessInfo[] => {
    const map = new Map<number, ProcessInfo & { children: ProcessInfo[] }>();
    const roots: ProcessInfo[] = [];
    procs.forEach(p => map.set(p.pid, { ...p, children: [] }));
    procs.forEach(p => {
      const node = map.get(p.pid)!;
      if (p.ppid && map.has(p.ppid)) { map.get(p.ppid)!.children.push(node); } else { roots.push(node); }
    });
    return roots;
  }, []);

  const buildGrouped = useCallback((procs: ProcessInfo[]): ProcessInfo[] => {
    const groups = new Map<string, ProcessInfo & { children: ProcessInfo[] }>();
    procs.forEach(p => {
      const baseName = p.name.split(/[ \/]/)[0].toLowerCase();
      if (!groups.has(baseName)) {
        // Simple string hash for stable ID
        let hash = 0;
        for (let i = 0; i < baseName.length; i++) {
          hash = ((hash << 5) - hash) + baseName.charCodeAt(i);
          hash = hash & hash;
        }
        groups.set(baseName, { 
          ...p, 
          children: [], 
          pid: (Math.abs(hash) % 1000000) * -1 
        } as any);
      }
      groups.get(baseName)!.children.push(p);
    });
    return Array.from(groups.values()).map(g => ({
       ...g,
       cpu_usage: g.children.reduce((acc, c) => acc + c.cpu_usage, 0),
       memory_usage: g.children.reduce((acc, c) => acc + c.memory_usage, 0),
       thread_count: g.children.reduce((acc, c) => acc + c.thread_count, 0),
    }));
  }, []);

  const displayData = useMemo(() => {
    let filtered = processes.filter(p => (selectedUser === 'all' || p.user === selectedUser) && (p.name.toLowerCase().includes(search.toLowerCase()) || p.pid.toString().includes(search)));
    if (focusedPid) {
       const focusRoot = processes.find(p => p.pid === focusedPid);
       if (focusRoot) {
          const getDescendants = (root: ProcessInfo, all: ProcessInfo[]): ProcessInfo[] => {
            const children = all.filter(p => p.ppid === root.pid);
            return [root, ...children.flatMap(c => getDescendants(c, all))];
          };
          filtered = getDescendants(focusRoot, processes);
       }
    }
    if (viewMode === 'list' && sortConfig) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key]; const valB = b[sortConfig.key];
        if (valA === null || valA === undefined) return 1; if (valB === null || valB === undefined) return -1;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    if (viewMode === 'tree') return buildTree(filtered);
    if (viewMode === 'group') return buildGrouped(filtered);
    return filtered;
  }, [processes, search, selectedUser, viewMode, sortConfig, buildTree, buildGrouped, focusedPid]);

  const requestSort = useCallback((key: keyof ProcessInfo) => {
    if (viewMode !== 'list') return;
    setSortConfig(prev => {
      let direction: 'asc' | 'desc' = 'asc';
      if (prev && prev.key === key && prev.direction === 'asc') direction = 'desc';
      return { key, direction };
    });
  }, [viewMode]);

  // Use a stable theme for the first render to match SSR
  const isDark = !isMounted || theme === 'dark';

  return (
    <div className={cn("h-screen flex flex-col transition-colors duration-500 font-sans overflow-hidden", isDark ? "bg-[#0a0a0c] text-zinc-100 dark" : "bg-slate-50 text-slate-900")}>
      <div className="shrink-0 pt-2">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setShowSystemDetails(true)}>
              <Cpu className={cn("w-3.5 h-3.5", isDark ? "text-purple-400" : "text-purple-600")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>CPU</span>
              <span className={cn("text-sm font-mono font-bold", isDark ? "text-zinc-200" : "text-slate-900")}>{history[history.length-1]?.cpu.toFixed(1) || 0}%</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className={cn("w-3.5 h-3.5", isDark ? "text-blue-400" : "text-blue-600")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>MEM</span>
              <span className={cn("text-sm font-mono font-bold", isDark ? "text-zinc-200" : "text-slate-900")}>{(history[history.length-1]?.mem / 1024 || 0).toFixed(1)} GB</span>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className={cn("w-3.5 h-3.5", isDark ? "text-emerald-400" : "text-emerald-600")} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-zinc-500" : "text-slate-500")}>Disk</span>
              <span className={cn("text-sm font-mono font-bold", isDark ? "text-zinc-200" : "text-slate-900")}>Healthy</span>
            </div>
          </div>
          <div className={cn("flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hidden sm:flex", isDark ? "text-zinc-600" : "text-slate-400")}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            PSArbor Live Agent
          </div>
        </div>

        <div className="px-6 pb-2">
          <MenuBar 
            viewMode={viewMode} setViewMode={setViewMode as any} 
            search={search} setSearch={setSearch}
            selectedUser={selectedUser} setSelectedUser={setSelectedUser} 
            users={users} visibleColumns={visibleColumns} 
            toggleColumn={(c) => setVisibleColumns(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])} 
            isPaused={isPaused} setIsPaused={setIsPaused} 
            onTakeSnapshot={handleTakeSnapshot} onExport={handleExportCSV}
            theme={theme} setTheme={setTheme}
            focusedPid={focusedPid} setFocusedPid={setFocusedPid}
            showGraphs={showGraphs} setShowGraphs={setShowGraphs}
          />
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 mx-6 border rounded-t-3xl overflow-hidden shadow-2xl flex flex-col mb-4 transition-colors duration-300", 
        isDark ? "bg-zinc-900/40 backdrop-blur-3xl border-white/5" : "bg-white border-slate-200 shadow-slate-200/50")}>
        <div className="flex-1 overflow-auto min-h-0 custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
            <thead className={cn("sticky top-0 backdrop-blur-xl z-20 shadow-sm border-b transition-colors", 
              isDark ? "bg-zinc-900/80 border-white/5" : "bg-white/90 border-slate-100")}>
              <tr className={isDark ? "text-zinc-500" : "text-slate-500"}>
                <Header label="PID" sortKey="pid" width="w-32" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />
                <Header label="Command" sortKey="name" width="w-72" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />
                <Header label="CPU %" sortKey="cpu_usage" width="w-40" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />
                <Header label="Memory" sortKey="memory_usage" width="w-40" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />
                {visibleColumns.includes('PPID') && <Header label="PPID" sortKey="ppid" width="w-24" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />}
                {visibleColumns.includes('Priority') && <Header label="Prio" sortKey="priority" width="w-24" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />}
                {visibleColumns.includes('Threads') && <Header label="Threads" sortKey="thread_count" width="w-24" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />}
                {visibleColumns.includes('Status') && <Header label="Status" sortKey="status" width="w-32" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} />}
                {visibleColumns.includes('User') && <Header label="User" sortKey="user" width="w-32" sortConfig={sortConfig} viewMode={viewMode === 'list' ? 'list' : 'tree'} requestSort={requestSort} isDark={isDark} /> }
                <th className="px-6 py-4 w-24 text-right pr-6 font-bold uppercase tracking-widest text-[10px]">Info</th>
              </tr>
            </thead>
            <tbody className={cn("divide-y", isDark ? "divide-white/5" : "divide-slate-100")}>
              <AnimatePresence mode="popLayout" initial={false}>
                {displayData.map(proc => (
                  <ProcessRow 
                    key={proc.pid} proc={proc} level={0} 
                    isTree={viewMode !== 'list'} visibleColumns={visibleColumns} 
                    onInspect={handleInspect} history={procHistory[proc.pid]} 
                    isWarning={warningPids.has(proc.pid)} isNew={snapshotPids ? !snapshotPids.has(proc.pid) : false}
                    theme={theme} showGraphs={showGraphs}
                  />
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isPaletteOpen && <CommandPalette processes={processes} onSelect={(p) => { setInspectingPid(p.pid); setIsPaletteOpen(false); }} onClose={() => setIsPaletteOpen(false)} isDark={isDark} />}
        {showSystemDetails && <SystemDetailTable cpus={cpus} sensors={sensors} disks={disks} networks={networks} onClose={() => setShowSystemDetails(false)} />}
        {inspectingPid && <ProcessDetailPanel pid={inspectingPid} processName={inspectingProcessName} setFocusedPid={setFocusedPid} onClose={() => setInspectingPid(null)} />}
      </AnimatePresence>
    </div>
  );
}

function Header({ label, sortKey, width, sortConfig, viewMode, requestSort, isDark }: any) {
  const isSorted = sortConfig?.key === sortKey;
  return (
    <th className={cn("px-6 py-4 font-bold uppercase tracking-widest text-[10px] select-none transition-colors", width, sortKey && viewMode === 'list' ? (isDark ? "cursor-pointer hover:text-purple-400 hover:bg-white/[0.02]" : "cursor-pointer hover:text-purple-600 hover:bg-slate-50") : "cursor-default")} onClick={() => sortKey && requestSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        {isSorted && viewMode === 'list' && <ArrowDown className={cn("w-3 h-3", sortConfig.direction === 'asc' ? "rotate-180" : "", isDark ? "text-purple-500" : "text-purple-600")} />}
      </div>
    </th>
  );
}

function CommandPalette({ processes, onSelect, onClose, isDark }: { processes: ProcessInfo[], onSelect: (p: ProcessInfo) => void, onClose: () => void, isDark: boolean }) {
  const [query, setQuery] = useState("");
  const filtered = processes.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.pid.toString().includes(query)).slice(0, 8);
  
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh] p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={cn("border w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden", isDark ? "bg-zinc-900 border-white/10" : "bg-white border-slate-200")} onClick={e => e.stopPropagation()}>
        <div className={cn("p-4 border-b flex items-center gap-3", isDark ? "border-white/10" : "border-slate-100")}>
          <Terminal className="text-purple-600 w-5 h-5" />
          <input autoFocus placeholder="Search for processes..." className={cn("bg-transparent border-none outline-none w-full font-medium", isDark ? "text-zinc-100 placeholder:text-zinc-600" : "text-slate-900 placeholder:text-slate-400")} value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <div className="max-h-96 overflow-y-auto p-2">
           {filtered.map(p => (
             <button key={p.pid} onClick={() => onSelect(p)} className={cn("w-full p-4 rounded-2xl flex items-center justify-between text-left transition-colors group", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                <div className="flex items-center gap-3">
                   <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs", isDark ? "bg-white/5 text-zinc-400" : "bg-slate-100 text-slate-500")}>{p.name.charAt(0)}</div>
                   <div>
                      <div className={cn("text-sm font-bold", isDark ? "text-zinc-200" : "text-slate-900")}>{p.name}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">PID {p.pid} • {p.user}</div>
                   </div>
                </div>
                <div className="text-[10px] font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">INSPECT →</div>
             </button>
           ))}
           {filtered.length === 0 && <div className="p-12 text-center text-zinc-500 text-sm">No processes found.</div>}
        </div>
      </motion.div>
    </motion.div>
  );
}
