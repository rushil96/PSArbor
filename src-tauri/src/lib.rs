use serde::Serialize;
use sysinfo::{Pid, System, Users, Disks, Networks, Components};
use std::sync::Mutex;
use tauri::State;
use std::process::Command;
use std::collections::HashMap;

#[derive(Serialize, Clone)]
pub struct ProcessInfo {
    pid: u32,
    ppid: Option<u32>,
    name: String,
    cpu_usage: f32,
    memory_usage: u64,
    status: String,
    user: String,
    thread_count: usize,
    priority: i32,
}

#[derive(Serialize)]
pub struct ProcessDetails {
    pid: u32,
    args: Vec<String>,
    environ: Vec<String>,
    cwd: String,
    exe: String,
}

#[derive(Serialize)]
pub struct UserInfo {
    uid: String,
    name: String,
}

#[derive(Serialize)]
pub struct CpuInfo {
    name: String,
    usage: f32,
    brand: String,
    frequency: u64,
}

#[derive(Serialize)]
pub struct DiskInfo {
    name: String,
    mount_point: String,
    total_space: u64,
    available_space: u64,
    is_removable: bool,
    file_system: String,
}

#[derive(Serialize)]
pub struct NetworkInfo {
    interface_name: String,
    received: u64,
    transmitted: u64,
    total_received: u64,
    total_transmitted: u64,
}

#[derive(Serialize)]
pub struct SensorInfo {
    label: String,
    temperature: f32,
    max: f32,
    critical: Option<f32>,
}

pub struct SystemState {
    pub sys: Mutex<System>,
    pub users: Mutex<Users>,
    pub disks: Mutex<Disks>,
    pub networks: Mutex<Networks>,
    pub components: Mutex<Components>,
}


#[tauri::command]
fn get_processes(state: State<'_, SystemState>) -> Vec<ProcessInfo> {
    let mut sys = state.sys.lock().unwrap();
    let mut users = state.users.lock().unwrap();
    
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    users.refresh();

    // Efficiently get thread counts for all processes on macOS
    #[cfg(target_os = "macos")]
    let (thread_counts, priorities) = {
        let mut t_counts = HashMap::new();
        let mut p_map = HashMap::new();

        // 1. Thread counts
        if let Ok(m_output) = Command::new("ps").args(["-ax", "-M", "-o", "pid="]).output() {
            let stdout = String::from_utf8_lossy(&m_output.stdout);
            for line in stdout.lines() {
                let tokens: Vec<&str> = line.split_whitespace().collect();
                if let Some(pid_str) = tokens.last() {
                    if let Ok(pid) = pid_str.parse::<u32>() {
                        *t_counts.entry(pid).or_insert(0) += 1;
                    }
                }
            }
        }

        // 2. Priorities (Niceness)
        if let Ok(p_output) = Command::new("ps").args(["-ax", "-o", "pid=,ni="]).output() {
            let stdout = String::from_utf8_lossy(&p_output.stdout);
            for line in stdout.lines() {
                let tokens: Vec<&str> = line.split_whitespace().collect();
                if tokens.len() >= 2 {
                    if let (Ok(pid), Ok(ni)) = (tokens[0].parse::<u32>(), tokens[1].parse::<i32>()) {
                        p_map.insert(pid, ni);
                    }
                }
            }
        }
        (t_counts, p_map)
    };

    sys.processes()
        .iter()
        .map(|(pid, process)| {
            #[cfg(target_os = "linux")]
            let (thread_count, priority) = (process.tasks().len(), 0);
            
            #[cfg(target_os = "macos")]
            let (thread_count, priority) = (
                thread_counts.get(&pid.as_u32()).cloned().unwrap_or(0),
                priorities.get(&pid.as_u32()).cloned().unwrap_or(0)
            );

            #[cfg(not(any(target_os = "linux", target_os = "macos")))]
            let (thread_count, priority) = (0, 0);

            let mut user_name = process.user_id()
                .map(|uid| {
                    if uid.to_string() == "0" {
                        return "root".to_string();
                    }
                    users.get_user_by_id(uid)
                        .map(|u| u.name().to_string())
                        .unwrap_or_else(|| uid.to_string())
                })
                .unwrap_or_else(|| "N/A".to_string());

            if (user_name == "N/A" || user_name.chars().all(|c| c.is_digit(10))) && cfg!(target_os = "macos") {
                if let Ok(output) = Command::new("ps")
                    .args(["-o", "user=", "-p", &pid.as_u32().to_string()])
                    .output() {
                        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if !name.is_empty() {
                            user_name = name;
                        }
                    }
            }

            ProcessInfo {
                pid: pid.as_u32(),
                ppid: process.parent().map(|p| p.as_u32()),
                name: process.name().to_string_lossy().to_string(),
                cpu_usage: process.cpu_usage(),
                memory_usage: process.memory(),
                status: format!("{:?}", process.status()),
                user: user_name,
                thread_count,
                priority,
            }
        })
        .collect()
}

#[tauri::command]
fn get_system_stats(state: State<'_, SystemState>) -> (Vec<CpuInfo>, Vec<SensorInfo>) {
    let mut sys = state.sys.lock().unwrap();
    let mut comps = state.components.lock().unwrap();
    
    sys.refresh_cpu_all();
    comps.refresh(true);

    let cpus = sys.cpus().iter().map(|cpu| CpuInfo {
        name: cpu.name().to_string(),
        usage: cpu.cpu_usage(),
        brand: cpu.brand().to_string(),
        frequency: cpu.frequency(),
    }).collect();

    let sensors = comps.iter().map(|c| SensorInfo {
        label: c.label().to_string(),
        temperature: c.temperature().unwrap_or(0.0),
        max: c.max().unwrap_or(0.0),
        critical: c.critical(),
    }).collect();

    (cpus, sensors)
}

#[tauri::command]
fn get_hardware_info(state: State<'_, SystemState>) -> (Vec<DiskInfo>, Vec<NetworkInfo>) {
    let mut disks = state.disks.lock().unwrap();
    let mut networks = state.networks.lock().unwrap();
    
    disks.refresh(true);
    networks.refresh(true);

    let disk_info = disks.iter().map(|d| DiskInfo {
        name: d.name().to_string_lossy().to_string(),
        mount_point: d.mount_point().to_string_lossy().to_string(),
        total_space: d.total_space(),
        available_space: d.available_space(),
        is_removable: d.is_removable(),
        file_system: d.file_system().to_string_lossy().to_string(),
    }).collect();

    let network_info = networks.iter().map(|(name, data)| NetworkInfo {
        interface_name: name.to_string(),
        received: data.received(),
        transmitted: data.transmitted(),
        total_received: data.total_received(),
        total_transmitted: data.total_transmitted(),
    }).collect();

    (disk_info, network_info)
}

#[tauri::command]
fn get_system_users(state: State<'_, SystemState>) -> Vec<UserInfo> {
    let users = state.users.lock().unwrap();
    users.iter().map(|u| UserInfo {
        uid: u.id().to_string(),
        name: u.name().to_string(),
    }).collect()
}

#[tauri::command]
fn get_process_details(state: State<'_, SystemState>, pid: u32) -> Result<ProcessDetails, String> {
    let mut sys = state.sys.lock().unwrap();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::Some(&[Pid::from_u32(pid)]), true);
    
    if let Some(process) = sys.process(Pid::from_u32(pid)) {
        Ok(ProcessDetails {
            pid,
            args: process.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect(),
            environ: process.environ().iter().map(|s| s.to_string_lossy().to_string()).collect(),
            cwd: process.cwd().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
            exe: process.exe().map(|p| p.to_string_lossy().to_string()).unwrap_or_default(),
        })
    } else {
        Err("Process not found".to_string())
    }
}

#[derive(Serialize)]
struct ResourceEntry {
    fd: String,
    resource_type: String,
    name: String,
}

#[tauri::command]
fn get_process_resources(pid: u32) -> Result<Vec<ResourceEntry>, String> {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("lsof")
            .args(["-p", &pid.to_string(), "-n", "-P"])
            .output();

        match output {
            Ok(o) => {
                let stdout = String::from_utf8_lossy(&o.stdout);
                let mut entries = Vec::new();
                for line in stdout.lines().skip(1) {
                    let tokens: Vec<&str> = line.split_whitespace().collect();
                    if tokens.len() >= 9 {
                        entries.push(ResourceEntry {
                            fd: tokens[3].to_string(),
                            resource_type: tokens[4].to_string(),
                            name: tokens[8..].join(" "),
                        });
                    }
                }
                Ok(entries)
            },
            Err(e) => Err(format!("Failed to run lsof: {}", e)),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("LSOF inspection is currently only supported on macOS.".to_string())
    }
}

#[tauri::command]
fn set_process_priority(_state: State<'_, SystemState>, pid: u32, priority: i32) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let status = Command::new("renice")
            .args([&priority.to_string(), "-p", &pid.to_string()])
            .status();
        
        match status {
            Ok(s) if s.success() => Ok(()),
            _ => Err("Failed to set priority. You may need higher permissions (sudo).".to_string()),
        }
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("Priority adjustment is currently only supported on macOS in this version.".to_string())
    }
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(url)
            .spawn()
            .map(|_| ())
            .map_err(|e| e.to_string())
    }
    #[cfg(not(target_os = "macos"))]
    {
        Err("URL opening is currently only supported on macOS.".to_string())
    }
}

pub fn run() {
    tauri::Builder::default()
        .manage(SystemState {
            sys: Mutex::new(System::new_all()),
            users: Mutex::new(Users::new_with_refreshed_list()),
            disks: Mutex::new(Disks::new_with_refreshed_list()),
            networks: Mutex::new(Networks::new_with_refreshed_list()),
            components: Mutex::new(Components::new_with_refreshed_list()),
        })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_processes, 
            get_process_details, 
            get_system_users,
            get_system_stats,
            get_hardware_info,
            set_process_priority,
            get_process_resources,
            open_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}




