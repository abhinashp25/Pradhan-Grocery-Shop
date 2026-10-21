import { useEffect } from "react";

// Every page has its own browser title and description.
export function useTitle(name: string, description?: string) {
  useEffect(() => {
    document.title = `${name} | Pradhan Grocery Store`;
    if (description) document.querySelector('meta[name="description"]')?.setAttribute("content", description);
  }, [name, description]);
}
