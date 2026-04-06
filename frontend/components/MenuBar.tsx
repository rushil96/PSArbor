"use client";

import React from "react";
import { 
  LayoutList, 
  Network, 
  LayoutGrid,
  Columns, 
  User as UserIcon,
  Check,
  Pause,
  Play,
  Camera,
  Download,
  Search,
  Sun,
  Moon,
  X,
  Activity,
  Terminal as CmdIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MenuBarProps {
  viewMode: 'list' | 'tree' | 'group';
  setViewMode: (mode: 'list' | 'tree' | 'group') => void;
  search: string;
  setSearch: (val: string) => void;
  selectedUser: string;
  setSelectedUser: (user: string) => void;
  users: { uid: string, name: string }[];
  visibleColumns: string[];
  toggleColumn: (col: string) => void;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  onTakeSnapshot: () => void;
  onExport: () => void;
  theme: 'dark' | 'light';
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
  focusedPid: number | null;
  setFocusedPid: (pid: number | null) => void;
  showGraphs: boolean;
  setShowGraphs: (val: boolean) => void;
}

export default function MenuBar({ 
  viewMode, 
  setViewMode, 
  search,
  setSearch,
  selectedUser, 
  setSelectedUser, 
  users,
  visibleColumns,
  toggleColumn,
  isPaused,
  setIsPaused,
  onTakeSnapshot,
  onExport,
  theme,
  setTheme,
  focusedPid,
  setFocusedPid,
  showGraphs,
  setShowGraphs
}: MenuBarProps) {
  const isDark = theme === 'dark';

  return (
    <div className={cn(
      "flex items-center justify-between backdrop-blur-xl border rounded-2xl p-1.5 mb-6 shadow-2xl relative z-[100] w-full transition-all duration-300",
      isDark ? "bg-zinc-900/60 border-white/5" : "bg-white/70 border-slate-200/60 shadow-slate-200/50"
    )}>
      <div className="flex items-center gap-3">
        {/* Logo & Search */}
        <div className={cn("flex items-center gap-2 pl-2 pr-4 border-r", isDark ? "border-white/5" : "border-slate-200")}>
          <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3">
            <CmdIcon className="text-white w-5 h-5" />
          </div>
          <span className={cn("hidden lg:block text-sm font-bold tracking-tight pr-2", isDark ? "text-white" : "text-slate-900")}>PSArbor</span>
        </div>

        <div className="relative group">
          <Search className={cn("absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 transition-colors", isDark ? "text-zinc-500 group-focus-within:text-purple-500" : "text-slate-400 group-focus-within:text-purple-600")} />
          <input 
            type="text" 
            placeholder="Search processes..." 
            className={cn(
              "border border-transparent rounded-xl py-1.5 pl-9 pr-4 text-xs transition-all outline-none w-48 sm:w-64",
              isDark ? "bg-white/5 text-white focus:bg-white/10 focus:border-purple-500/30" : "bg-slate-100 text-slate-900 focus:bg-white focus:border-purple-600/30 shadow-sm"
            )}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
            <span className={cn("text-[10px] px-1 rounded", isDark ? "text-zinc-500 bg-white/5" : "text-slate-400 bg-slate-200")}>⌘</span>
            <span className={cn("text-[10px] px-1 rounded", isDark ? "text-zinc-500 bg-white/5" : "text-slate-400 bg-slate-200")}>K</span>
          </div>
        </div>

        {focusedPid && (
          <button 
            onClick={() => setFocusedPid(null)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 border rounded-xl text-[10px] font-bold transition-all group/focus",
              isDark ? "bg-purple-500/20 border-purple-500/30 text-purple-400 hover:bg-purple-500/30" : "bg-purple-50 border-purple-200 text-purple-600 hover:bg-purple-100"
            )}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
            FOCUS: {focusedPid}
            <X className="w-3 h-3 ml-1 opacity-50 group-hover/focus:opacity-100" />
          </button>
        )}

        <div className={cn("w-px h-6", isDark ? "bg-white/5" : "bg-slate-200")} />

        {/* View Mode Toggle */}
        <div className={cn("flex rounded-xl p-0.5", isDark ? "bg-white/5" : "bg-slate-100")}>
          {[
            { mode: 'list', icon: LayoutList, label: 'List' },
            { mode: 'tree', icon: Network, label: 'Tree' },
            { mode: 'group', icon: LayoutGrid, label: 'Group' }
          ].map(({ mode, icon: Icon, label }) => (
            <button 
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                viewMode === mode 
                  ? (isDark ? "bg-purple-500/20 text-purple-400 shadow-sm" : "bg-white text-purple-600 shadow-sm border border-slate-200") 
                  : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-500 hover:text-slate-900")
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1.5 pr-1">
        {/* Analysis Group */}
        <div className={cn("flex rounded-xl p-0.5", isDark ? "bg-white/5" : "bg-slate-100")}>
          <button 
            onClick={() => setShowGraphs(!showGraphs)}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              showGraphs 
                ? (isDark ? "text-purple-400 bg-purple-500/10" : "text-purple-600 bg-white shadow-sm border border-slate-200")
                : (isDark ? "text-zinc-500 hover:text-zinc-300" : "text-slate-400 hover:text-slate-600")
            )}
            title={showGraphs ? "Hide Process Graphs (Performance)" : "Show Process Graphs"}
          >
            <Activity className="w-4 h-4" />
          </button>
          <button 
            onClick={onTakeSnapshot}
            title="Session Snapshot"
            className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-zinc-500 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm border border-transparent hover:border-slate-200")}
          >
            <Camera className="w-4 h-4" />
          </button>
          <button 
            onClick={onExport}
            title="Export CSV"
            className={cn("p-1.5 rounded-lg transition-all", isDark ? "text-zinc-500 hover:text-white hover:bg-white/5" : "text-slate-500 hover:text-slate-900 hover:bg-white shadow-sm border border-transparent hover:border-slate-200")}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

        <div className={cn("w-px h-6", isDark ? "bg-white/5" : "bg-slate-200")} />

        {/* User Filter */}
        <div className="relative group">
          <button className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all", isDark ? "text-zinc-400 hover:bg-white/5" : "text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm")}>
            <UserIcon className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{selectedUser === 'all' ? 'Users' : selectedUser}</span>
          </button>
          <div className={cn(
            "absolute top-full right-0 mt-2 w-48 border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] p-1",
            isDark ? "bg-zinc-900 border-white/10" : "bg-white border-slate-200"
          )}>
            <button onClick={() => setSelectedUser('all')} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
              All Users {selectedUser === 'all' && <Check className="w-3 h-3 text-purple-500" />}
            </button>
            <div className={cn("h-px my-1", isDark ? "bg-white/5" : "bg-slate-100")} />
            <div className="max-h-64 overflow-y-auto custom-scrollbar">
              {users.map(u => (
                <button key={u.uid} onClick={() => setSelectedUser(u.name)} className={cn("w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                  {u.name} {selectedUser === u.name && <Check className="w-3 h-3 text-purple-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Columns */}
        <div className="relative group">
          <button className={cn("flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all", isDark ? "text-zinc-400 hover:bg-white/5" : "text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 shadow-sm")}>
            <Columns className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cols</span>
          </button>
          <div className={cn(
            "absolute top-full right-0 mt-2 w-48 border rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-[110] p-1",
            isDark ? "bg-zinc-900 border-white/10" : "bg-white border-slate-200"
          )}>
            {['PPID', 'Threads', 'Priority', 'Status', 'User'].map(col => (
              <button key={col} onClick={() => toggleColumn(col)} className={cn("w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between font-mono", isDark ? "hover:bg-white/5" : "hover:bg-slate-50")}>
                {col} {visibleColumns.includes(col) && <Check className="w-3 h-3 text-purple-500" />}
              </button>
            ))}
          </div>
        </div>

        <div className={cn("w-px h-6", isDark ? "bg-white/5" : "bg-slate-200")} />

        {/* Freeze & Theme */}
        <button 
          onClick={() => setIsPaused(!isPaused)}
          className={cn(
            "p-2 rounded-xl transition-all",
            isPaused ? (isDark ? "bg-amber-500/20 text-amber-400" : "bg-amber-50 text-amber-600 border border-amber-200") : (isDark ? "text-zinc-500 hover:text-zinc-100" : "text-slate-500 hover:text-slate-900")
          )}
          title={isPaused ? "Resume Updates" : "Freeze Updates"}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>

        <button 
          onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
          className={cn("p-2 border rounded-xl transition-all ml-1", isDark ? "bg-white/5 border-white/10 hover:bg-white/10" : "bg-white border-slate-200 hover:bg-slate-50 shadow-sm")}
        >
           {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>
      </div>
    </div>
  );
}

MenuBar.displayName = "MenuBar";
