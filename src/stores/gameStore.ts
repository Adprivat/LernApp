import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/errorHandler';
import { useAuthStore } from '@/stores/authStore';
import type { GameSession, GamePlayer, Question, GameAnswer } from '@/types';
import questionsData from '@/data/questions.json';

interface GameState {
  session: GameSession | null;
  players: GamePlayer[];
  questions: Question[];
  currentQuestion: Question | null;
  currentQuestionIndex: number;
  answers: Record<number, number>; // question_index -> answer_index
  timeLeft: number;
  gameOver: boolean;
  loading: boolean;

  createSoloSession: (category: string, questionCount: number) => Promise<string>;
  joinSession: (sessionId: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  submitAnswer: (answerIndex: number, timeTakenMs: number) => Promise<void>;
  nextQuestion: () => void;
  endGame: () => void;
  reset: () => void;
}

function shuffleQuestions(category: string, count: number): Question[] {
  const catData = (questionsData as any).categories[category];
  if (!catData) return [];
  const qs = catData.questions.map((q: any, i: number) => ({
    id: `${category}_${i}`,
    category,
    ...q,
  }));
  const shuffled = [...qs].sort(() => Math.random() - 0.5);
  if (count === 0) return shuffled; // endless mode
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export const useGameStore = create<GameState>((set, get) => ({
  session: null,
  players: [],
  questions: [],
  currentQuestion: null,
  currentQuestionIndex: 0,
  answers: {},
  timeLeft: 20,
  gameOver: false,
  loading: false,

  createSoloSession: async (category: string, questionCount: number) => {
    set({ loading: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Nicht angemeldet');

      const { data: session, error } = await supabase
        .from('game_sessions')
        .insert({
          mode: 'solo',
          status: 'active',
          category,
          question_count: questionCount,
          time_per_question: 20,
          current_question_index: 0,
          host_id: user.id,
          question_start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('game_players').insert({
        session_id: session.id,
        user_id: user.id,
        score: 0,
        correct_answers: 0,
        wrong_answers: 0,
        is_ready: true,
        is_finished: false,
      });

      const { data: players } = await supabase
        .from('game_players')
        .select('*, profile:profiles(*)')
        .eq('session_id', session.id);

      const questions = shuffleQuestions(category, questionCount);

      // For endless mode (questionCount === 0), use actual question count in DB record
      if (questionCount === 0) {
        await supabase
          .from('game_sessions')
          .update({ question_count: questions.length })
          .eq('id', session.id);
        session.question_count = questions.length;
      }

      set({
        session,
        players: players || [],
        questions,
        currentQuestion: questions[0] || null,
        currentQuestionIndex: 0,
        answers: {},
        gameOver: false,
        timeLeft: 20,
        loading: false,
      });

      return session.id;
    } catch (err) {
      set({ loading: false });
      throw err;
    }
  },

  joinSession: async (sessionId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: existingData, error: existingError } = await supabase
      .from('game_players')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    // PGRST116 = row not found — expected when player hasn't joined yet
    if (existingError && existingError.code !== 'PGRST116') {
      console.error('joinSession check error:', getErrorMessage(existingError));
    }

    if (!existingData) {
      await supabase.from('game_players').insert({
        session_id: sessionId,
        user_id: user.id,
        score: 0,
        correct_answers: 0,
        wrong_answers: 0,
        is_ready: false,
        is_finished: false,
      });
    }

    await get().loadSession(sessionId);
  },

  loadSession: async (sessionId: string) => {
    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('loadSession error:', getErrorMessage(sessionError));
      return;
    }

    if (!session) return;

    const { data: players } = await supabase
      .from('game_players')
      .select('*, profile:profiles(*)')
      .eq('session_id', sessionId);

    const questions = shuffleQuestions(session.category, session.question_count);

    set({
      session,
      players: players || [],
      questions,
      currentQuestion: questions[session.current_question_index] || null,
      currentQuestionIndex: session.current_question_index,
    });
  },

  submitAnswer: async (answerIndex: number, timeTakenMs: number) => {
    const { session, questions, currentQuestionIndex, answers } = get();
    const { data: { user } } = await supabase.auth.getUser();
    if (!session || !user) return;

    const question = questions[currentQuestionIndex];
    if (!question) return;

    const isCorrect = answerIndex === question.correct_index;
    const maxPoints = 100;
    const timeBonus = Math.max(0, Math.floor((20000 - timeTakenMs) / 200));
    const basePoints = isCorrect ? maxPoints + timeBonus : 0;
    // Mode multiplier
    const mode = session.mode;
    const pointsEarned = mode === 'challenge' ? basePoints * 2
      : mode === 'group' ? Math.floor(basePoints / 2)
      : basePoints; // solo and tournament unchanged

    await supabase.from('game_answers').insert({
      session_id: session.id,
      user_id: user.id,
      question_index: currentQuestionIndex,
      answer_index: answerIndex,
      is_correct: isCorrect,
      time_taken_ms: timeTakenMs,
      points_earned: pointsEarned,
    });

    // Update player score — also update local store so endGame reads current values
    const player = get().players.find(p => p.user_id === user.id);
    if (player) {
      const updatedPlayer = {
        ...player,
        score: player.score + pointsEarned,
        correct_answers: player.correct_answers + (isCorrect ? 1 : 0),
        wrong_answers: player.wrong_answers + (isCorrect ? 0 : 1),
      };
      await supabase
        .from('game_players')
        .update({
          score: updatedPlayer.score,
          correct_answers: updatedPlayer.correct_answers,
          wrong_answers: updatedPlayer.wrong_answers,
        })
        .eq('id', player.id);

      set({
        players: get().players.map(p => p.id === player.id ? updatedPlayer : p),
      });
    }

    set({
      answers: { ...answers, [currentQuestionIndex]: answerIndex },
    });
  },

  nextQuestion: () => {
    const { questions, currentQuestionIndex } = get();
    const next = currentQuestionIndex + 1;
    if (next >= questions.length) {
      get().endGame();
    } else {
      set({
        currentQuestionIndex: next,
        currentQuestion: questions[next],
        timeLeft: 20,
      });
    }
  },

  endGame: async () => {
    const { session, players } = get();
    const { data: { user } } = await supabase.auth.getUser();
    if (!session || !user) {
      set({ gameOver: true });
      return;
    }

    // Transition session active→finished; only succeeds for the first caller
    const { data: didTransition } = await supabase
      .from('game_sessions')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', session.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle();

    // If already finished by another player, still mark it finished (idempotent)
    if (!didTransition) {
      await supabase
        .from('game_sessions')
        .update({ status: 'finished' })
        .eq('id', session.id);
    }

    await supabase
      .from('game_players')
      .update({ is_finished: true })
      .eq('session_id', session.id)
      .eq('user_id', user.id);

    // Update profile stats
    const myPlayer = players.find(p => p.user_id === user.id);
    const isWinner = players.length > 1 &&
      myPlayer?.score === Math.max(...players.map(p => p.score));

    await supabase.rpc('update_player_stats', {
      p_user_id: user.id,
      p_score: myPlayer?.score || 0,
      p_won: isWinner,
      p_correct: myPlayer?.correct_answers || 0,
    });

    // Tournament winner bonus: add the score again as a bonus
    if (session.mode === 'tournament' && isWinner) {
      await supabase.rpc('update_player_stats', {
        p_user_id: user.id,
        p_score: myPlayer?.score || 0,
        p_won: false, // don't double count the win
        p_correct: 0,
      });
    }

    // Tournament end: first finisher sends winner notification to all participants
    if (session.mode === 'tournament' && didTransition) {
      const { data: allPlayers } = await supabase
        .from('game_players')
        .select('user_id, score, profile:profiles(username)')
        .eq('session_id', session.id);

      if (allPlayers && allPlayers.length > 0) {
        const winner = allPlayers.reduce((a: any, b: any) => a.score > b.score ? a : b);
        const winnerName = (winner as any).profile?.username || 'Unbekannt';

        await supabase.from('notifications').insert(
          allPlayers.map((p: any) => ({
            user_id: p.user_id,
            type: 'tournament_end',
            title: 'Turnier beendet!',
            message: p.user_id === winner.user_id
              ? 'Du hast das Turnier gewonnen! 🏆'
              : `${winnerName} hat das Turnier gewonnen! 🏆`,
            data: { session_id: session.id, winner_id: winner.user_id },
            is_read: false,
          }))
        );
      }
    }

    // Refresh profile so stats on HomePage/ProfilePage are up to date
    await useAuthStore.getState().fetchProfile();

    set({ gameOver: true });
  },

  reset: () => {
    set({
      session: null,
      players: [],
      questions: [],
      currentQuestion: null,
      currentQuestionIndex: 0,
      answers: {},
      timeLeft: 20,
      gameOver: false,
      loading: false,
    });
  },
}));
