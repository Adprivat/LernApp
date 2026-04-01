import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

export function DatenschutzPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-nexus-muted hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} /> Zurück
      </Link>

      <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <img src="/logo-white.jpg" alt="Adrian Schultz Logo" className="w-14 h-14 rounded-lg object-contain bg-white" />
          <div>
            <h1 className="text-2xl font-black text-white">Datenschutzerklärung</h1>
            <p className="text-sm text-nexus-muted">Stand: April 2026</p>
          </div>
        </div>

        <div className="flex flex-col gap-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-white font-bold mb-2">1. Verantwortlicher</h2>
            <p>
              Adrian Schultz<br />
              E-Mail: <a href="mailto:Kontakt@adrianschultz.de" className="text-nexus-accent hover:text-white transition-colors">Kontakt@adrianschultz.de</a>
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">2. Erhobene Daten</h2>
            <p>Bei der Nutzung dieser Anwendung werden folgende Daten verarbeitet:</p>
            <ul className="list-disc list-inside mt-2 flex flex-col gap-1 text-slate-400">
              <li><span className="text-slate-300">Benutzername</span> — frei gewählt, zur Identifikation im Spiel</li>
              <li><span className="text-slate-300">Passwort</span> — verschlüsselt gespeichert (bcrypt), niemals im Klartext</li>
              <li><span className="text-slate-300">Profilbild</span> — optional, vom Nutzer hochgeladen</li>
              <li><span className="text-slate-300">Spielstatistiken</span> — Punkte, Siege, gespielte Runden, Serien</li>
              <li><span className="text-slate-300">Chat-Nachrichten</span> — innerhalb von Spielsitzungen</li>
              <li><span className="text-slate-300">Online-Status & letzte Aktivität</span> — für die Anzeige im Spiel</li>
            </ul>
            <p className="mt-2"><strong className="text-white">Es wird keine E-Mail-Adresse erhoben.</strong> Intern wird eine synthetische Adresse (benutzername@lernapp.local) verwendet, die nicht real existiert.</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">3. Zweck der Verarbeitung</h2>
            <ul className="list-disc list-inside flex flex-col gap-1 text-slate-400">
              <li>Bereitstellung der Lernplattform und Spielfunktionen</li>
              <li>Authentifizierung und Zuordnung von Spielergebnissen</li>
              <li>Anzeige von Bestenlisten und Statistiken</li>
              <li>Echtzeit-Kommunikation im Spielchat</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">4. Rechtsgrundlage</h2>
            <p>
              Die Verarbeitung erfolgt auf Grundlage von <a href="https://dsgvo-gesetz.de/art-6-dsgvo/" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Art. 6 Abs. 1 lit. b DSGVO</a>
              (Vertragserfüllung) — die Daten sind zur Bereitstellung des Dienstes erforderlich —
              sowie <a href="https://dsgvo-gesetz.de/art-6-dsgvo/" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Art. 6 Abs. 1 lit. a DSGVO</a> (Einwilligung) durch Registrierung.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">5. Speicherung & Hosting</h2>
            <p>
              Die Datenbank und Authentifizierung werden bei{' '}
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Supabase</a>{' '}
              (Cloud-Infrastruktur) betrieben. Supabase nutzt Rechenzentren innerhalb der EU/EWR.
              Weitere Informationen zur Datenverarbeitung durch Supabase finden Sie in deren{' '}
              <a href="https://supabase.com/privacy" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Datenschutzerklärung</a>.
            </p>
            <p className="mt-2">
              Die Webanwendung selbst wird bei{' '}
              <a href="https://render.com" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Render</a>{' '}
              (Render Services, Inc., USA) gehostet. Dabei werden Daten in die USA übertragen.
              Render verarbeitet Daten auf Grundlage von Standardvertragsklauseln (<a href="https://dsgvo-gesetz.de/art-46-dsgvo/" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Art. 46 Abs. 2 lit. c DSGVO</a>)
              gemäß dem EU-US Data Privacy Framework. Weitere Informationen:{' '}
              <a href="https://render.com/privacy" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">Render Datenschutzerklärung</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">6. Cookies & Tracking</h2>
            <p>
              Diese Anwendung verwendet <strong className="text-white">keine Tracking-Cookies</strong> und
              setzt <strong className="text-white">keine Analyse-Tools</strong> (z. B. Google Analytics) ein.
              Es werden lediglich technisch notwendige Session-Tokens für die Authentifizierung verwendet.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">7. Deine Rechte</h2>
            <p>Du hast jederzeit das Recht auf:</p>
            <ul className="list-disc list-inside mt-2 flex flex-col gap-1 text-slate-400">
              <li><span className="text-slate-300">Auskunft</span> über deine gespeicherten Daten</li>
              <li><span className="text-slate-300">Berichtigung</span> unrichtiger Daten</li>
              <li><span className="text-slate-300">Löschung</span> deines Kontos und aller zugehörigen Daten</li>
              <li><span className="text-slate-300">Widerspruch</span> gegen die Verarbeitung</li>
              <li><span className="text-slate-300">Datenübertragbarkeit</span></li>
            </ul>
            <p className="mt-2">
              Kontaktiere uns dafür unter{' '}
              <a href="mailto:Kontakt@adrianschultz.de" className="text-nexus-accent hover:text-white transition-colors">Kontakt@adrianschultz.de</a>.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">8. Beschwerde bei einer Aufsichtsbehörde</h2>
            <p>
              Unbeschadet eines anderweitigen Rechtsbehelfs steht dir das Recht auf Beschwerde bei
              einer Datenschutz-Aufsichtsbehörde zu, insbesondere in dem Mitgliedstaat deines
              Aufenthaltsorts, deines Arbeitsplatzes oder des Orts des mutmaßlichen Verstoßes.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-nexus-border text-center">
          <Link to="/impressum" className="text-sm text-nexus-accent hover:text-white transition-colors">
            ← Impressum
          </Link>
        </div>
      </div>
    </div>
  );
}
