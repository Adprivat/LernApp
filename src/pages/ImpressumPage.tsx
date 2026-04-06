import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

export function ImpressumPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-nexus-muted hover:text-white transition-colors mb-6">
        <ArrowLeft size={16} /> Zurück
      </Link>

      <div className="bg-nexus-surface/70 backdrop-blur-sm border border-nexus-border rounded-lg p-6 sm:p-8">
        <div className="flex items-center gap-4 mb-8">
          <img src="/logo-white.jpg" alt="Adrian Schultz Logo" className="w-14 h-14 rounded-lg object-contain bg-white" />
          <div>
            <h1 className="text-2xl font-black text-white">Impressum</h1>
            <p className="text-sm text-nexus-muted">Angaben gemäß <a href="https://www.gesetze-im-internet.de/ddg/__5.html" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">§ 5 DDG</a></p>
          </div>
        </div>

        <div className="flex flex-col gap-6 text-sm text-slate-300 leading-relaxed">
          <section>
            <h2 className="text-white font-bold mb-2">Verantwortlich</h2>
            <p>Adrian Schultz</p>
            <p>Oberste Gasse 16</p>
            <p>34117 Kassel</p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">Kontakt</h2>
            <a
              href="mailto:Kontakt@adrianschultz.de"
              className="inline-flex items-center gap-2 text-nexus-accent hover:text-white transition-colors"
            >
              <Mail size={14} />
              Kontakt@adrianschultz.de
            </a>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">Haftung für Inhalte</h2>
            <p>
              Als Diensteanbieter sind wir gemäß <a href="https://www.gesetze-im-internet.de/ddg/__7.html" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">§ 7 Abs.1 DDG</a> für eigene Inhalte auf diesen Seiten
              nach den allgemeinen Gesetzen verantwortlich. Nach <a href="https://www.gesetze-im-internet.de/ddg/__8.html" target="_blank" rel="noopener noreferrer" className="text-nexus-accent hover:text-white transition-colors">§ 8 DDG</a> sind wir als
              Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
              Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
              Tätigkeit hinweisen.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">Haftung für Links</h2>
            <p>
              Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
              Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.
              Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber
              der Seiten verantwortlich.
            </p>
          </section>

          <section>
            <h2 className="text-white font-bold mb-2">Urheberrecht</h2>
            <p>
              Die durch den Betreiber dieser Seite erstellten Inhalte und Werke unterliegen dem
              deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art
              der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen
              Zustimmung des jeweiligen Autors bzw. Erstellers.
            </p>
          </section>
        </div>

        <div className="mt-8 pt-6 border-t border-nexus-border text-center">
          <Link to="/datenschutz" className="text-sm text-nexus-accent hover:text-white transition-colors">
            Datenschutzerklärung →
          </Link>
        </div>
      </div>
    </div>
  );
}
