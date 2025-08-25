import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { api, Player, Tournament, Match, MatchResult } from '@/lib/api';

// Version-based polling hook for real-time updates
export const useVersionPolling = (tournamentId: string = 'current') => {
  const queryClient = useQueryClient();
  const lastVersionRef = useRef(-1);

  useEffect(() => {
    const pollVersion = async () => {
      try {
        const response = await fetch(`/api/version?id=${tournamentId}`);
        if (!response.ok) return;
        
        const { v } = await response.json();
        
        if (v !== lastVersionRef.current && lastVersionRef.current !== -1) {
          console.log(`Version changed: ${lastVersionRef.current} -> ${v}, invalidating queries`);
          
          // Invalidate key queries when version changes
          queryClient.invalidateQueries({ queryKey: ['matches', tournamentId] });
          queryClient.invalidateQueries({ queryKey: ['tournaments'] });
          queryClient.invalidateQueries({ queryKey: ['rankings'] });
          queryClient.invalidateQueries({ queryKey: ['players'] }); // Add players query invalidation
        }
        
        lastVersionRef.current = v;
      } catch (error) {
        console.warn('Version polling error:', error);
      }
    };

    // Initial poll
    pollVersion();
    
    // Poll every 5 seconds (reduced from 1.5s to improve performance)
    const interval = setInterval(pollVersion, 5000);
    
    return () => clearInterval(interval);
  }, [tournamentId, queryClient]);
};

// Players hooks
export const usePlayers = (enablePolling = false) => {
  return useQuery({
    queryKey: ['players'],
    queryFn: api.getPlayers,
    staleTime: enablePolling ? 1000 * 10 : 1000 * 60 * 5, // 10 seconds when polling, 5 minutes otherwise
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: enablePolling ? 1000 * 30 : false, // Poll every 30 seconds when enabled (reduced frequency)
    retry: 1, // Limit retries
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });
};

export const usePlayer = (id: string) => {
  return useQuery({
    queryKey: ['player', id],
    queryFn: () => api.getPlayer(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1,
    refetchOnWindowFocus: false,
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: false,
    retry: 1,
    refetchOnWindowFocus: false,
  });
};

// Tournaments hooks
export const useTournaments = (enablePolling = false) => {
  return useQuery({
    queryKey: ['tournaments'],
    queryFn: api.getTournaments,
    staleTime: enablePolling ? 1000 * 10 : 1000 * 60 * 5, // 10 seconds when polling, 5 minutes otherwise
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
    refetchInterval: enablePolling ? 1000 * 30 : false, // Poll every 30 seconds when enabled (reduced frequency)
    retry: 1, // Reduce retry attempts
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });
};;

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
export const useMatches = (playerId?: string, enablePolling = false) => {
  return useQuery({
    queryKey: ['matches', playerId],
    queryFn: () => {
      // Early return if no valid playerId
      if (!playerId || playerId === 'undefined' || playerId === 'null') {
        console.warn('Invalid playerId for matches query:', playerId);
        return [];
      }
      return api.getMatches(playerId);
    },
    enabled: !!playerId && playerId !== 'undefined' && playerId !== 'null', // Only run if valid playerId
    staleTime: enablePolling ? 1000 * 5 : 1000 * 60 * 5, // 5 seconds when polling, 5 minutes otherwise
    refetchInterval: enablePolling ? 1000 * 10 : false, // Poll every 10 seconds when enabled
    retry: false, // Disable retries
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });
};;

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
    refetchInterval: false, // Using version-based polling instead
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
    onSuccess: (data, variables) => {
      // Immediately invalidate all match-related caches
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      
      // Force refetch matches for better UX
      queryClient.refetchQueries({ queryKey: ['matches'] });
    },
    onMutate: async (matchId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['matches'] });
      
      // Optimistically update the match status
      const previousMatches = queryClient.getQueryData(['matches']);
      
      queryClient.setQueryData(['matches'], (old: any) => {
        if (!old) return old;
        return old.map((match: any) => 
          match.match_id === matchId 
            ? { ...match, status: 'in_progress' }
            : match
        );
      });
      
      return { previousMatches };
    },
    onError: (err, matchId, context) => {
      // If mutation fails, revert the optimistic update
      if (context?.previousMatches) {
        queryClient.setQueryData(['matches'], context.previousMatches);
      }
    },
  });
};