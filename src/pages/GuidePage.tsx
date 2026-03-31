import React, { useState } from 'react';
import { BookOpen, Zap, Users, Trophy, Target, Clock, Star, ChevronDown, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Link } from 'react-router-dom';

interface Section {
  id: string;
  icon: React.ReactNode;
  title: string;
  color: string;
  content: React.ReactNode;
}

export function GuidePage() {
  const [open, setOpen] = useState<string | null>('solo');

  const toggle = (id: string) => setOpen(prev => prev === id ? null : id);

  const sections: Section[] = [
    {
      id: 'basics',
      icon: <Star size={20} />,
      title: 'Grundregeln',
      color: 'text-yellow-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>LernApp ist eine kompetitive Lernplattform. Pro Frage hast du <strong className="text-white">20 Sekunden</strong> Zeit.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Punktesystem</p>
            <ul className="flex flex-col gap-1.5">
              <li>✅ Richtige Antwort: <span className="text-emerald-400 font-bold">100 Punkte</span> + Zeitbonus</li>
              <li>⚡ Zeitbonus: bis zu <span className="text-yellow-400 font-bold">~100 Extrapunkte</span> bei sofortiger Antwort</li>
              <li>❌ Falsch oder Zeit abgelaufen: <span className="text-red-400 font-bold">0 Punkte</span></li>
            </ul>
          </div>
          <p>Der Zeitbonus berechnet sich als: <code className="bg-slate-700 px-2 py-0.5 rounded text-xs">⌊(20000 − ms) / 200⌋</code></p>
        </div>
      ),
    },
    {
      id: 'solo',
      icon: <BookOpen size={20} />,
      title: 'Solo-Modus',
      color: 'text-blue-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>Lerne alleine in deinem eigenen Tempo. Ideal zum Üben ohne Druck.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">So funktioniert's</p>
            <ol className="flex flex-col gap-1.5 list-decimal list-inside">
              <li>Wähle eine <strong className="text-white">Kategorie</strong> und die <strong className="text-white">Fragenanzahl</strong></li>
              <li>Beantworte jede Frage innerhalb von 20 Sekunden</li>
              <li>Am Ende siehst du deine Statistiken und alle Antworten</li>
            </ol>
          </div>
          <p>Punkte aus Solo-Spielen zählen für deine Gesamtstatistik.</p>
          <Link to="/learn" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium">
            <BookOpen size={14} /> Zum Solo-Modus →
          </Link>
        </div>
      ),
    },
    {
      id: 'challenge',
      icon: <Zap size={20} />,
      title: 'Herausforderung (1v1)',
      color: 'text-amber-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>Fordere einen bestimmten Spieler heraus oder stelle eine offene Herausforderung für alle bereit.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Ablauf</p>
            <ol className="flex flex-col gap-1.5 list-decimal list-inside">
              <li><strong className="text-white">Gezielt:</strong> Gib den Benutzernamen deines Gegners ein</li>
              <li><strong className="text-white">Offen:</strong> Stelle eine Herausforderung ohne Gegner — jeder kann beitreten</li>
              <li>Sobald der Gegner annimmt, startet das Spiel für <em>beide sofort</em></li>
              <li>Wer mehr Punkte sammelt, gewinnt</li>
            </ol>
          </div>
          <p>Bei Gleichstand gewinnt der Schnellere (Zeitbonus entscheidet).</p>
          <Link to="/challenge" className="inline-flex items-center gap-2 text-amber-400 hover:text-amber-300 font-medium">
            <Zap size={14} /> Zu den Herausforderungen →
          </Link>
        </div>
      ),
    },
    {
      id: 'group',
      icon: <Users size={20} />,
      title: 'Gruppen-Modus',
      color: 'text-emerald-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>Spiele mit mehreren Spielern gleichzeitig in einer Lobby.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Ablauf</p>
            <ol className="flex flex-col gap-1.5 list-decimal list-inside">
              <li>Erstelle eine Gruppe oder tritt einer bestehenden bei</li>
              <li>Warte in der Lobby bis alle bereit sind</li>
              <li>Der Host startet das Spiel</li>
              <li>Alle Spieler beantworten dieselben Fragen gleichzeitig</li>
              <li>Live-Rangliste zeigt den aktuellen Stand</li>
            </ol>
          </div>
          <p>Der Chat in der Lobby und im Spiel ist für alle Mitspieler sichtbar.</p>
          <Link to="/groups" className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium">
            <Users size={14} /> Zu den Gruppen →
          </Link>
        </div>
      ),
    },
    {
      id: 'tournament',
      icon: <Trophy size={20} />,
      title: 'Turnier-Modus',
      color: 'text-yellow-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <p>Turniere bringen viele Spieler in einem strukturierten Wettbewerb zusammen.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Ablauf</p>
            <ol className="flex flex-col gap-1.5 list-decimal list-inside">
              <li>Erstelle ein Turnier mit Name, Kategorie und maximaler Spielerzahl</li>
              <li>Spieler melden sich an (bis das Limit erreicht ist)</li>
              <li>Wenn mindestens 2 Spieler angemeldet sind, kann der Ersteller starten</li>
              <li>Alle spielen gleichzeitig — die Gesamtpunkte entscheiden</li>
            </ol>
          </div>
          <Link to="/tournament" className="inline-flex items-center gap-2 text-yellow-400 hover:text-yellow-300 font-medium">
            <Trophy size={14} /> Zu den Turnieren →
          </Link>
        </div>
      ),
    },
    {
      id: 'stats',
      icon: <Target size={20} />,
      title: 'Statistiken & Errungenschaften',
      color: 'text-purple-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Deine Stats</p>
            <ul className="flex flex-col gap-1.5">
              <li>🏆 <strong className="text-white">Siege</strong> — gewonnene Multiplayer-Spiele</li>
              <li>🔥 <strong className="text-white">Serie</strong> — aufeinanderfolgende Siege</li>
              <li>⭐ <strong className="text-white">Beste Serie</strong> — dein persönlicher Rekord</li>
              <li>🎯 <strong className="text-white">Siegrate</strong> — Siege / gespielte Spiele</li>
              <li>💎 <strong className="text-white">Gesamtpunkte</strong> — kumuliert über alle Spiele</li>
            </ul>
          </div>
          <p>Errungenschaften werden automatisch nach jedem Spiel geprüft und vergeben.</p>
          <div className="bg-slate-700/50 rounded-xl p-4">
            <p className="font-semibold text-white mb-2">Rangliste</p>
            <p>Die globale Rangliste zeigt alle Spieler nach Gesamtpunkten sortiert.</p>
          </div>
        </div>
      ),
    },
    {
      id: 'tips',
      icon: <Clock size={20} />,
      title: 'Tipps & Tricks',
      color: 'text-pink-400',
      content: (
        <div className="flex flex-col gap-3 text-slate-300 text-sm leading-relaxed">
          <ul className="flex flex-col gap-2">
            <li>⚡ <strong className="text-white">Schnell antworten lohnt sich</strong> — der Zeitbonus kann den Unterschied machen</li>
            <li>🎯 <strong className="text-white">Lieber schnell falsch als langsam richtig?</strong> — Nein. Falsch gibt 0 Punkte, egal wie schnell</li>
            <li>🔥 <strong className="text-white">Serien aufrechterhalten</strong> — jeder Sieg verlängert deine Serie und schaltet Errungenschaften frei</li>
            <li>📚 <strong className="text-white">Kategorien wählen</strong> — stärke deine Schwächen im Solo-Modus bevor du Herausforderungen annimmst</li>
            <li>👥 <strong className="text-white">Chat nutzen</strong> — im Gruppen- und Lobby-Chat kannst du Gegner einschüchtern 😄</li>
          </ul>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <BookOpen size={32} className="text-indigo-400" />
        <div>
          <h1 className="text-3xl font-black text-white">Spielanleitung</h1>
          <p className="text-slate-400 text-sm mt-1">Alles was du wissen musst</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {sections.map(({ id, icon, title, color, content }) => (
          <Card key={id} padding="none" className="overflow-hidden">
            <button
              onClick={() => toggle(id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-slate-700/30 transition-colors"
            >
              <span className={color}>{icon}</span>
              <span className="font-semibold text-white flex-1">{title}</span>
              {open === id
                ? <ChevronDown size={18} className="text-slate-400" />
                : <ChevronRight size={18} className="text-slate-400" />
              }
            </button>
            {open === id && (
              <div className="px-5 pb-5 border-t border-slate-700/50 pt-4">
                {content}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
