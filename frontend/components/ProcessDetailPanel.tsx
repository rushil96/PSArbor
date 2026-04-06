"use client";

import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { 
  X, 
  Terminal, 
  Globe, 
  Folder, 
  Cpu, 
  Database,
  Hash,
  Shield,
  ExternalLink,
  AlertTriangle,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProcessDetails {
  pid: number;
  name?: string; // Optional name for search
  args: string[];
  environ: string[];
  cwd: string;
  exe: string;
}

interface ResourceEntry {
  fd: string;
  resource_type: string;
  name: string;
}

export default function ProcessDetailPanel({ 
  pid, 
  processName,
  setFocusedPid,
  onClose 
}: { 
  pid: number | null, 
  processName?: string,
  setFocusedPid: (pid: number | null) => void,
  onClose: () => void 
}) {
  const [details, setDetails] = useState<ProcessDetails | null>(null);
  const [resources, setResources] = useState<ResourceEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'args' | 'env' | 'files' | 'network' | 'security' | 'info'>('args');
  const [loadingResources, setLoadingResources] = useState(false);

  useEffect(() => {
    if (pid) {
      invoke<ProcessDetails>("get_process_details", { pid })
        .then(setDetails)
        .catch(err => console.error(err));
      
      if (activeTab === 'files' || activeTab === 'network') {
        fetchResources();
      }
    } else {
      setDetails(null);
      setResources([]);
    }
  }, [pid, activeTab]);

  const handleSecurityCheck = (type: 'vt' | 'google') => {
    if (!processName) return;
    const url = type === 'vt' 
      ? `https://www.virustotal.com/gui/search/${processName}`
      : `https://www.google.com/search?q=process+${processName}+macos+heavy+usage`;
    invoke("open_url", { url });
  };

  const fetchResources = async () => {
    if (!pid) return;
    setLoadingResources(true);
    try {
      const res = await invoke<ResourceEntry[]>("get_process_resources", { pid });
      setResources(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingResources(false);
    }
  };

  if (!pid) return null;

  return (
    <>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[99] cursor-default"
      />
      <motion.div 
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 w-full sm:w-1/3 bg-zinc-900 border-l border-white/5 shadow-2xl z-[100] flex flex-col p-6 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Hash className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">{processName || `PID ${pid}`} Inspector</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
              onClick={() => { setFocusedPid(pid); onClose(); }}
              title="Focus this process hierarchy"
              className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/20 transition-all text-[10px] font-bold uppercase tracking-wider"
             >
               <Target className="w-3.5 h-3.5" />
               Focus
             </button>
             <button 
               onClick={onClose}
               className="p-2 hover:bg-white/5 rounded-full transition-colors text-zinc-500 hover:text-white"
             >
               <X className="w-5 h-5" />
             </button>
          </div>
        </div>

        <div className="flex gap-4 border-b border-white/5 mb-6 overflow-x-auto custom-scrollbar whitespace-nowrap">
          <TabButton active={activeTab === 'args'} onClick={() => setActiveTab('args')} label="Args" icon={<Terminal className="w-3.5 h-3.5" />} />
          <TabButton active={activeTab === 'env'} onClick={() => setActiveTab('env')} label="Env" icon={<Database className="w-3.5 h-3.5" />} />
          <TabButton active={activeTab === 'files'} onClick={() => setActiveTab('files')} label="Files" icon={<Folder className="w-3.5 h-3.5" />} />
          <TabButton active={activeTab === 'network'} onClick={() => setActiveTab('network')} label="Network" icon={<Globe className="w-3.5 h-3.5" />} />
          <TabButton active={activeTab === 'security'} onClick={() => setActiveTab('security')} label="Security" icon={<Shield className="w-3.5 h-3.5" />} />
          <TabButton active={activeTab === 'info'} onClick={() => setActiveTab('info')} label="Paths" icon={<Cpu className="w-3.5 h-3.5" />} />
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {!details ? (
            <div className="flex flex-col items-center justify-center h-48 opacity-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4" />
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'args' && (
                <div className="space-y-3">
                  {details.args.length === 0 ? (
                    <p className="text-zinc-500 text-sm italic py-8 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">No arguments found.</p>
                  ) : (
                    details.args.map((arg, i) => (
                      <div key={i} className="p-3 bg-zinc-800/40 rounded-xl border border-white/5 text-[11px] font-mono text-zinc-300 break-all leading-relaxed">
                        <span className="text-purple-500 mr-2 opacity-50">[{i}]</span> {arg}
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'security' && (
                 <div className="space-y-6">
                    <div className="p-6 bg-purple-500/5 rounded-2xl border border-purple-500/10 flex flex-col items-center text-center gap-2">
                       <Shield className="w-10 h-10 text-purple-400 mb-2" />
                       <h3 className="text-sm font-bold text-white">Process Reputation</h3>
                       <p className="text-xs text-zinc-500">Audit this process using external intelligence databases.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                       <button 
                          onClick={() => handleSecurityCheck('vt')}
                          className="flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl border border-white/5 transition-all text-left group"
                       >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                               <AlertTriangle className="w-4 h-4" />
                             </div>
                             <div>
                                <div className="text-xs font-bold text-zinc-200">VirusTotal Audit</div>
                                <div className="text-[10px] text-zinc-500 font-medium tracking-tight">Check for malware or vulnerabilities</div>
                             </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                       </button>

                       <button 
                          onClick={() => handleSecurityCheck('google')}
                          className="flex items-center justify-between p-4 bg-zinc-800/40 hover:bg-zinc-800 rounded-2xl border border-white/5 transition-all text-left group"
                       >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                               <Globe className="w-4 h-4" />
                             </div>
                             <div>
                                <div className="text-xs font-bold text-zinc-200">Google Research</div>
                                <div className="text-[10px] text-zinc-500 font-medium tracking-tight">Search for known macOS process impact</div>
                             </div>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 text-zinc-600 group-hover:text-purple-400 transition-colors" />
                       </button>
                    </div>
                 </div>
              )}

              {activeTab === 'env' && (
                <div className="space-y-2">
                  {details.environ.map((env, i) => {
                    const [key, ...rest] = env.split('=');
                    return (
                      <div key={i} className="flex flex-col p-2 hover:bg-white/[0.02] rounded-lg transition-colors border-b border-white/5">
                        <span className="text-[10px] text-purple-400 font-bold uppercase mb-0.5 tracking-tighter">{key}</span>
                        <span className="text-xs font-mono text-zinc-400 break-all">{rest.join('=')}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {(activeTab === 'files' || activeTab === 'network') && (
                <div className="space-y-3">
                  {loadingResources ? (
                    <div className="p-12 text-center text-zinc-500 text-xs animate-pulse">Scanning file handles...</div>
                  ) : (
                    resources
                      .filter(r => activeTab === 'network' ? ['IPv4', 'IPv6', 'inet', 'inet6'].includes(r.resource_type) : !['IPv4', 'IPv6', 'inet', 'inet6'].includes(r.resource_type))
                      .map((res, i) => (
                        <div key={i} className="p-3 bg-zinc-800/20 rounded-xl border border-white/5 flex flex-col gap-1 group">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-purple-500 uppercase">{res.fd} • {res.resource_type}</span>
                           </div>
                           <span className="text-[11px] font-mono text-zinc-400 break-all group-hover:text-zinc-200 transition-colors">{res.name}</span>
                        </div>
                      ))
                  )}
                  {resources.length === 0 && !loadingResources && (
                     <div className="p-12 text-center text-zinc-600 text-xs italic">No entries found for this category.</div>
                  )}
                </div>
              )}

              {activeTab === 'info' && (
                <div className="space-y-6">
                  <InfoRow label="Executable" value={details.exe} icon={<Terminal className="w-4 h-4" />} />
                  <InfoRow label="Working Directory" value={details.cwd} icon={<Folder className="w-4 h-4" />} />
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function TabButton({ active, onClick, label, icon }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-1 pb-3 text-xs font-medium transition-all relative",
        active ? "text-purple-400" : "text-zinc-500 hover:text-zinc-300"
      )}
    >
      {icon}
      {label}
      {active && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />}
    </button>
  );
}

function InfoRow({ label, value, icon }: any) {
  return (
    <div className="space-y-2 group">
      <div className="flex items-center gap-2 text-zinc-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
      </div>
      <div className="p-4 bg-zinc-800/50 rounded-2xl border border-white/5 text-xs font-mono text-zinc-300 group-hover:border-purple-500/30 transition-colors break-all">
        {value || "Unknown"}
      </div>
    </div>
  );
}
