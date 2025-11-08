import { useState, useEffect } from "react";
import { backendFetch } from "./backend-config";

// Custom hook to fetch backend tools repeatedly
export function useBackendTools(path = "/tools", intervalMs = 3000) {
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    let isMounted = true;

    const fetchTools = async () => {
      try {
        const res = await backendFetch(path);

        if (!res.ok) {
          if (res.status !== 401) {
            console.error(
              `Error fetching backend tools: ${res.status} ${res.statusText}`
            );
          }
          return;
        }

        const data = await res.json();

        if (Array.isArray(data)) {
          if (isMounted) setTools(data);
        } else if (data && Array.isArray((data as any).tools)) {
          if (isMounted) setTools((data as any).tools);
        } else {
          console.warn("Unexpected backend tools response format", data);
        }
      } catch (error) {
        console.error("Error fetching backend tools:", error);
      }
    };

    fetchTools();
    const intervalId = setInterval(fetchTools, intervalMs);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [path, intervalMs]);

  return tools;
}
