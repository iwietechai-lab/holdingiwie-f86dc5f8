import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Gerencia, SubGerencia, Area, Position } from '@/types/organization';

interface UseOrganizationReturn {
  gerencias: Gerencia[];
  subGerencias: SubGerencia[];
  areas: Area[];
  positions: Position[];
  isLoading: boolean;
  error: string | null;
  fetchByCompany: (companyId: string) => Promise<void>;
  getSubGerenciasByGerencia: (gerenciaId: string) => SubGerencia[];
  getAreasByGerencia: (gerenciaId: string) => Area[];
  getPositionsByGerencia: (gerenciaId: string) => Position[];
}

export function useOrganization(): UseOrganizationReturn {
  const [gerencias, setGerencias] = useState<Gerencia[]>([]);
  const [subGerencias, setSubGerencias] = useState<SubGerencia[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCompany = useCallback(async (companyId: string) => {
    if (!companyId) return;
    
    setIsLoading(true);
    setError(null);

    try {
      // Fetch gerencias
      const { data: gerenciasData, error: gerenciasError } = await supabase
        .from('gerencias')
        .select('*')
        .eq('company_id', companyId)
        .order('order_index');

      if (gerenciasError) throw gerenciasError;
      setGerencias((gerenciasData || []) as unknown as Gerencia[]);

      // Get gerencia IDs
      const gerenciaIds = (gerenciasData || []).map(g => g.id);

      if (gerenciaIds.length > 0) {
        // Fetch sub_gerencias
        const { data: subGerenciasData } = await supabase
          .from('sub_gerencias')
          .select('*')
          .in('gerencia_id', gerenciaIds)
          .order('order_index');
        setSubGerencias((subGerenciasData || []) as unknown as SubGerencia[]);

        // Fetch areas
        const { data: areasData } = await supabase
          .from('areas')
          .select('*')
          .in('gerencia_id', gerenciaIds)
          .order('order_index');
        setAreas((areasData || []) as unknown as Area[]);

        // Fetch positions
        const { data: positionsData } = await supabase
          .from('positions')
          .select('*')
          .in('gerencia_id', gerenciaIds)
          .order('order_index');
        setPositions((positionsData || []) as unknown as Position[]);
      }
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError(err instanceof Error ? err.message : 'Error loading organization');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getSubGerenciasByGerencia = useCallback((gerenciaId: string) => {
    return subGerencias.filter(sg => sg.gerencia_id === gerenciaId);
  }, [subGerencias]);

  const getAreasByGerencia = useCallback((gerenciaId: string) => {
    return areas.filter(a => a.gerencia_id === gerenciaId);
  }, [areas]);

  const getPositionsByGerencia = useCallback((gerenciaId: string) => {
    return positions.filter(p => p.gerencia_id === gerenciaId);
  }, [positions]);

  return {
    gerencias,
    subGerencias,
    areas,
    positions,
    isLoading,
    error,
    fetchByCompany,
    getSubGerenciasByGerencia,
    getAreasByGerencia,
    getPositionsByGerencia,
  };
}
