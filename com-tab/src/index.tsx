import { List, Toast, showToast } from "@raycast/api";
import { exec } from "child_process";
import { useEffect, useState } from "react";
import { promisify } from "util";

const execAsync = promisify(exec);

interface RunningApp {
  name: string;
  isFrontmost: boolean;
}

const getRunningApps = async (): Promise<RunningApp[]> => {
  const script = `
    set output to ""
    tell application "System Events"
    set frontApp to name of first process whose frontmost is true
    repeat with theProcess in processes where background only is false
        set appName to name of theProcess
        try
            set appFile to file of theProcess
            set realName to name of appFile
        on error
            set realName to appName
        end try
        set isFrontmost to appName is frontApp
        set output to output & realName & "," & isFrontmost & "\n"
    end repeat
    end tell
    return output
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const lines = stdout.trim().split("\n");
    return lines.map((line) => {
      const [name, isFrontmost] = line.split(",");
      return { name, isFrontmost: isFrontmost === "true" };
    });
  } catch (error) {
    console.error("Error executing AppleScript:", error);
    await showToast({ style: Toast.Style.Failure, title: "Failed to get running applications" });
    return [];
  }
};

export default function Command() {
  const [runningApps, setRunningApps] = useState<RunningApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRunningApps() {
      const apps = await getRunningApps();
      setRunningApps(apps);
      setIsLoading(false);
    }

    fetchRunningApps(); // Fetch immediately on mount

    // Set up interval to fetch every 2 seconds
    const intervalId = setInterval(fetchRunningApps, 2000);

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title="Aplicaciones en Ejecución">
        {runningApps.map((app, index) => (
          <List.Item 
            key={index} 
            title={app.name} 
            icon={app.isFrontmost ? { source: "🔵" } : { source: "⚪️" }}
          />
        ))}
      </List.Section>
    </List>
  );
}