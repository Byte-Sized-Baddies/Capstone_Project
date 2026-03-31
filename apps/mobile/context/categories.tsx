// apps/mobile/app/context/categories.tsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAuth } from "./auth";
import { useProjects } from "./projects";

export type Category = {
  id: number;
  name: string;
  projectId: string | null;
};

type CategoriesContextType = {
  categories: Category[];
  loading: boolean;
};

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeProjectId } = useProjects();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase.from('categories_v2').select('*');
    
    // Filter categories by the active project if one is selected
    if (activeProjectId) {
      query = query.eq('project_id', activeProjectId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setCategories(data.map(c => ({
        id: c.id,
        name: c.name,
        projectId: c.project_id
      })));
    }
    setLoading(false);
  }, [user, activeProjectId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  return (
    <CategoriesContext.Provider value={{ categories, loading }}>
      {children}
    </CategoriesContext.Provider>
  );
}

export const useCategories = () => useContext(CategoriesContext);