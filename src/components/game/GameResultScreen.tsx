import React, { useState } from 'react';
import { Trophy, Star, Target, Zap, RotateCcw, Home, Flag } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Scoreboard } from './Scoreboard';
import type { GamePlayer, Question, GameAnswer } from '@/types';
import { Link } from 'react-router-dom';

interface GameResultScreenProps {
  players: GamePlayer[];
  questions: Question[];
  answers: Record<number, number>;
  currentUserId: string;
  onPlayAgain?: () => void;
  mode: string;
}

export function GameResultScreen({
  players, questions, answers, currentUserId, onPlayAgain, mode
}: GameResultScreenProps) {
  const myPlayer = players.find(p => p.user_id === currentUserId);
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const myRank = sorted.findIndex(p => p.user_id === currentUserId) + 1;
  const isWinner = myRank === 1 && players.length > 1;
  const total = questions.length;
  const correct = myPlayer?.correct_answers || 0;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;


  const [reportQuestion, setReportQuestion] = useState<Question | null>(null);
  const [reportMessage, setReportMessage] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [reportError, setReportError] = useState('');

  const handleReportSubmit = async () => {
    if (!reportQuestion || !reportMessage.trim()) return;
    setReportSending(true);
    setReportError('');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_KEY,
          subject: `Frage melden: ${reportQuestion.question}`,
          message: reportMessage,
          from_name: 'LernApp Spieler',
        }),
      });
      if (!res.ok) throw new Error('Senden fehlgeschlagen');
      setReportSent(true);
      setTimeout(() => {
        setReportQuestion(null);
        setReportMessage('');
        setReportSent(false);
      }, 2000);
    } catch {
      setReportError('Nachricht konnte nicht gesendet werden. Bitte versuche es später erneut.');
    } finally {
      setReportSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto py-8 animate-fade-in-up">
      {/* Header */}
      <div className="text-center">
        <div className="text-6xl mb-4">
          {isWinner ? '🏆' : myRank === 2 ? '🥈' : myRank === 3 ? '🥉' : mode === 'solo' ? '📊' : '🎮'}
        </div>
        <h1 className="text-3xl font-black text-white mb-2">
          {mode === 'solo' ? 'Ergebnis' : isWinner ? 'Gewonnen!' : 'Spiel beendet'}
        </h1>
        {players.length > 1 && (
          <p className="text-nexus-muted">
            {isWinner ? 'Glückwunsch, du hast gewonnen!' : `Du bist auf Platz ${myRank}`}
          </p>
        )}
      </div>

      {/* My stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-3xl font-black text-nexus-accent">{myPlayer?.score.toLocaleString() || 0}</div>
          <div className="text-xs text-nexus-muted mt-1 flex items-center justify-center gap-1">
            <Star size={10} />
            Punkte
          </div>
        </div>
        <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-3xl font-black text-emerald-400">{accuracy}%</div>
          <div className="text-xs text-nexus-muted mt-1 flex items-center justify-center gap-1">
            <Target size={10} />
            Genauigkeit
          </div>
        </div>
        <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-3 sm:p-4 text-center">
          <div className="text-xl sm:text-3xl font-black text-amber-400">{correct}/{total}</div>
          <div className="text-xs text-nexus-muted mt-1 flex items-center justify-center gap-1">
            <Zap size={10} />
            Richtig
          </div>
        </div>
      </div>

      {/* Answers review */}
      <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-5">
        <h3 className="font-bold text-white mb-4">Antworten im Überblick</h3>
        <div className="flex flex-col gap-2">
          {questions.map((q, idx) => {
            const given = answers[idx];
            const correct = given === q.correct_index;
            const skipped = given === undefined;
            return (
              <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${
                correct ? 'bg-emerald-500/10' : skipped ? 'bg-nexus-bg/50' : 'bg-red-500/10'
              }`}>
                <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  correct ? 'bg-emerald-500 text-white' : skipped ? 'bg-nexus-surface text-nexus-muted' : 'bg-red-500 text-white'
                }`}>
                  {correct ? '✓' : skipped ? '–' : '✗'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium leading-snug">{q.question}</p>
                  {!correct && !skipped && (
                    <p className="text-xs text-nexus-muted mt-1">
                      Richtig: <span className="text-emerald-400">{q.answers[q.correct_index]}</span>
                    </p>
                  )}
                  {skipped && (
                    <p className="text-xs text-nexus-muted mt-1">Nicht beantwortet</p>
                  )}
                </div>
                <button
                  onClick={() => { setReportQuestion(q); setReportMessage(''); setReportError(''); setReportSent(false); }}
                  className="flex-shrink-0 p-1.5 rounded-lg text-nexus-muted hover:text-amber-400 hover:bg-nexus-bg/60 transition-all duration-200"
                  title="Frage melden"
                >
                  <Flag size={14} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Multiplayer scoreboard */}
      {players.length > 1 && (
        <div>
          <h3 className="font-bold text-white mb-4">Rangliste</h3>
          <Scoreboard players={players} currentUserId={currentUserId} />
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-3">
          {onPlayAgain && (
            <Button variant="primary" onClick={onPlayAgain} fullWidth>
              <RotateCcw size={18} />
              Nochmal spielen
            </Button>
          )}
          <Link to="/" className="flex-1">
            <Button variant="secondary" fullWidth>
              <Home size={18} />
              Startseite
            </Button>
          </Link>
        </div>
        <div className="flex justify-center">
          <a
            href="https://www.buymeacoffee.com/adrianschuz"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#5F7FFF', color: '#ffffff', border: '2px solid #000000' }}
          >
            <span style={{ color: '#FFDD00' }}>☕</span>
            Buy me a coffee
          </a>
        </div>
      </div>

      {/* Report Question Modal */}
      <Modal
        isOpen={reportQuestion !== null}
        onClose={() => { setReportQuestion(null); setReportMessage(''); setReportError(''); setReportSent(false); }}
        title="Frage melden"
        size="md"
      >
        {reportSent ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-emerald-400 font-medium">Vielen Dank! Deine Meldung wurde gesendet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="bg-nexus-bg/60 border border-nexus-border rounded-lg p-3">
              <p className="text-xs text-nexus-muted mb-1">Betroffene Frage:</p>
              <p className="text-sm text-white font-medium">{reportQuestion?.question}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-nexus-muted">Deine Nachricht</label>
              <textarea
                value={reportMessage}
                onChange={e => setReportMessage(e.target.value)}
                placeholder="Beschreibe das Problem mit dieser Frage..."
                rows={4}
                className="bg-nexus-bg border border-nexus-border rounded-lg px-4 py-3 text-white placeholder-nexus-muted focus:outline-none focus:border-nexus-primary focus:ring-2 focus:ring-nexus-primary/20 focus:shadow-[0_0_10px_rgba(46,91,255,0.15)] transition-all duration-300 ease-in-out w-full resize-none"
              />
            </div>
            {reportError && <p className="text-sm text-red-400">{reportError}</p>}
            <Button
              variant="primary"
              onClick={handleReportSubmit}
              loading={reportSending}
              disabled={!reportMessage.trim()}
              fullWidth
            >
              <Flag size={16} />
              Meldung senden
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
