import { useState, useEffect } from "react";

interface Model {
  id: string;
  name: string;
}

let cache: Model[] | null = null;

export default function useFetchModels() {
  const [models, setModels] = useState<Model[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          cache = data;
          setModels(data);
        }
      })
      .catch(() => {});
  }, []);

  return models;
}
