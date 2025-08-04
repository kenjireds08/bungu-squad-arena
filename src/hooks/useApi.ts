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

export const useUpdatePlayerTournamentActive = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      fetch(`/api/players?id=${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updateTournamentActive: active })
      }).then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      }),
    onSuccess: () => {
      // Invalidate all related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
};

// Rankings hooks
export const useRankings = () => {
  return useQuery({
    queryKey: ['rankings'],
    queryFn: api.getRankings,
    staleTime: 1000 * 30, // Emergency: Extended to 30 seconds
    refetchInterval: 1000 * 60, // Emergency: Extended to 60 seconds to prevent rate limit
    retry: 1, // Reduce retry attempts
  });
};

// Tournaments hooks
export const useTournaments = () => {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: api.getTournaments,
    staleTime: 1000 * 30, // Emergency: Extended to 30 seconds
    refetchInterval: 1000 * 60, // Emergency: Extended to 60 seconds to prevent rate limit
    retry: 1, // Reduce retry attempts
  });
};

export const useCreateTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (tournament: Parameters<typeof api.createTournament>[0]) =>
      api.createTournament(tournament),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
};

export const useUpdateTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, tournament }: { id: string; tournament: Parameters<typeof api.updateTournament>[1] }) =>
      api.updateTournament(id, tournament),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
};

export const useDeleteTournament = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => api.deleteTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
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

// Match Results hooks
export const useSubmitMatchResult = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (resultData: { matchId: string; playerId: string; result: 'win' | 'lose'; opponentId: string }) => 
      api.submitMatchResult(resultData),
    onSuccess: () => {
      // Invalidate pending results query for admin
      queryClient.invalidateQueries({ queryKey: ['pendingMatchResults'] });
    },
  });
};

export const usePendingMatchResults = () => {
  return useQuery({
    queryKey: ['pendingMatchResults'],
    queryFn: api.getPendingMatchResults,
    staleTime: 1000 * 30, // Emergency: Extended to 30 seconds
    refetchInterval: 1000 * 60, // Emergency: Extended to 60 seconds to prevent rate limit
    retry: 1,
  });
};

export const useApproveMatchResult = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ resultId, approved }: { resultId: string; approved: boolean }) => 
      api.approveMatchResult(resultId, approved),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['pendingMatchResults'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
    },
  });
};

export const useAdminDirectInput = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (matchData: { matchId: string; winnerId: string; loserId: string }) => 
      api.adminDirectInput(matchData),
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['pendingMatchResults'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['rankings'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
  });
};

export const useStartMatch = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (matchId: string) => api.startMatch(matchId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
    },
  });
};