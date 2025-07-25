import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Player, Tournament, Match, MatchResult } from '@/lib/api';

// Players hooks
export const usePlayers = () => {
  return useQuery({
    queryKey: ['players'],
    queryFn: api.getPlayers,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const usePlayer = (id: string) => {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => api.getPlayer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useUpdatePlayerRating = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      api.updatePlayerRating(id, rating),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    },
  });
};

// Rankings hooks
export const useRankings = () => {
  return useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

// Tournaments hooks
export const useTournaments = () => {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: api.getTournaments,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
};

// Matches hooks
export const useMatches = (playerId?: string) => {
  return useQuery({
    queryKey: ['matches', playerId],
    queryFn: () => api.getMatches(playerId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddMatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (matchResult: MatchResult) => api.addMatch(matchResult),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    },
  });
};