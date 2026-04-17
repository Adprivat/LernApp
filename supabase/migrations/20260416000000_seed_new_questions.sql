-- ============================================================
-- Seed: 19 new questions — IT-Sicherheit & Anwendungsentwicklung
-- Topics: Schutzziele, Identitätsmanagement, Netzwerksicherheit,
--         Secure SDLC, Zero-Trust, Monitoring
-- sort_order 326–344 (appended to existing 0–325)
-- ============================================================

insert into public.questions (category_id, question, answers, correct_index, difficulty, tags, sort_order)
values
  -- Schutzziele der Informationssicherheit
  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Schutzziel der Informationssicherheit gewährleistet, dass Daten während einer Übertragung nicht unbefugt oder unbemerkt verändert werden?', ARRAY['Verfügbarkeit', 'Vertraulichkeit', 'Integrität', 'Authentizität'], 2, 'easy', ARRAY['it_sicherheit']::text[], 326),

  ((select id from public.question_categories where key = 'exam_prep'), 'Eine Webanwendung nutzt TLS (Transport Layer Security) bei der Datenübertragung. Welchem primären Schutzziel dient diese Maßnahme?', ARRAY['Ausfallsicherheit', 'Vertraulichkeit', 'Integrität', 'Verfügbarkeit'], 1, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 327),

  ((select id from public.question_categories where key = 'exam_prep'), 'Der Einsatz von redundanten Servern in einem Unternehmen dient primär der Sicherstellung welches Schutzziels?', ARRAY['Authentizität', 'Vertraulichkeit', 'Verfügbarkeit', 'Integrität'], 2, 'easy', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 328),

  -- Identitäts- und Zugriffsmanagement
  ((select id from public.question_categories where key = 'exam_prep'), 'Was ist der wesentliche Unterschied zwischen Authentifizierung und Autorisierung?', ARRAY['Es gibt keinen Unterschied, beide Begriffe sind synonym.', 'Authentifizierung ist die Prüfung der Identität, Autorisierung ist die Zuweisung von Rechten auf Ressourcen.', 'Authentifizierung prüft Berechtigungen, Autorisierung prüft die Identität.', 'Authentifizierung erfolgt nur bei der Anmeldung, Autorisierung nur bei der Abmeldung.'], 1, 'medium', ARRAY['it_sicherheit']::text[], 329),

  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Verfahren erhöht die Sicherheit beim Login deutlich, indem neben dem Passwort ein zweiter Faktor (z. B. ein Token) verlangt wird?', ARRAY['Single Sign-On (SSO)', 'Zertifikatsbasierte Verschlüsselung', 'Mehrfaktor-Authentifizierung (MFA)', 'Rollenbasierte Zugriffskontrolle (RBAC)'], 2, 'easy', ARRAY['it_sicherheit']::text[], 330),

  -- Netzwerksicherheit & Infrastruktur
  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Ziel verfolgt die logische Trennung von Netzbereichen durch VLANs oder Firewalls?', ARRAY['Überwachung der Arbeitszeiten der Mitarbeiter.', 'Reduzierung der Angriffsfläche und Schutz sicherheitskritischer Systeme.', 'Erhöhung der Bandbreite für alle Nutzer.', 'Automatische Installation von Updates auf allen Clients.'], 1, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 331),

  ((select id from public.question_categories where key = 'exam_prep'), 'Warum ist eine Netzwerksegmentierung sinnvoll, wenn ein Unternehmen einen öffentlichen Webserver und einen internen Datenbankserver betreibt?', ARRAY['Um die Anzahl der benötigten IP-Adressen zu verringern.', 'Um die Kosten für die Internetanbindung zu senken.', 'Damit bei einer Kompromittierung des Webservers der Zugriff auf das interne Netz erschwert wird.', 'Damit der Webserver schneller auf die Datenbank zugreifen kann.'], 2, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 332),

  -- Sichere Anwendungsentwicklung & Monitoring
  ((select id from public.question_categories where key = 'exam_prep'), 'Welcher Prozess im Software-Lebenszyklus befasst sich primär mit dem Schließen von Sicherheitslücken, die durch veraltete Bibliotheken entstehen?', ARRAY['Dokumentations-Management', 'Patch- und Update-Management', 'Benutzeroberflächen-Design', 'Lastentest-Management'], 1, 'medium', ARRAY['it_sicherheit', 'softwareentwicklung']::text[], 333),

  ((select id from public.question_categories where key = 'exam_prep'), 'Welchen Nutzen bietet eine zentrale Logging- oder SIEM-Lösung einem Unternehmen?', ARRAY['Sie erhöht die physische Sicherheit der Serverräume.', 'Sie ermöglicht die Nachverfolgung von Zugriffen und die frühzeitige Erkennung von Angriffen.', 'Sie ersetzt die Notwendigkeit von Firewalls.', 'Sie dient der automatischen Erstellung von Rechnungen.'], 1, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 334),

  ((select id from public.question_categories where key = 'exam_prep'), 'Ein Entwickler integriert eine Open-Source-Bibliothek. Welches Risiko besteht dabei primär?', ARRAY['Die Bibliothek verhindert den Internetzugriff der Anwendung.', 'Die Bibliothek kann nur auf Linux-Systemen genutzt werden.', 'Die Bibliothek könnte bekannte Sicherheitslücken enthalten.', 'Die Bibliothek verbraucht zu viel Festplattenspeicher.'], 2, 'easy', ARRAY['it_sicherheit', 'softwareentwicklung']::text[], 335),

  -- Zero-Trust & Netzwerksegmentierung
  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Grundprinzip verfolgt ein „Zero-Trust-Konzept" innerhalb der Netzwerksicherheit?', ARRAY['Sicherheitsprüfungen erfolgen ausschließlich an der äußeren Netzwerkgrenze (Firewall).', 'Allen Geräten innerhalb des internen Firmennetzwerks wird standardmäßig vertraut.', 'Vertrauen wird grundsätzlich niemandem gewährt; jede Zugriffsanfrage muss kontinuierlich verifiziert werden, egal von wo sie kommt.', 'Es werden keine Passwörter mehr benötigt, da das Netzwerk „blind" vertraut.'], 2, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 336),

  ((select id from public.question_categories where key = 'exam_prep'), 'Warum ist eine Netzwerksegmentierung (z. B. durch VLANs) sinnvoll, wenn ein Unternehmen einen öffentlichen Webserver und einen internen Datenbankserver betreibt?', ARRAY['Damit beide Server dieselbe IP-Adresse nutzen können.', 'Weil Datenbanken technisch nicht im selben Netzwerk wie Webserver betrieben werden können.', 'Um bei einer Kompromittierung des Webservers den unbefugten Zugriff auf das interne Datenbanknetz zu erschweren oder zu verhindern.', 'Um die physikalische Distanz zwischen den Servern zu vergrößern.'], 2, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 337),

  -- Secure Development Lifecycle (SDLC)
  ((select id from public.question_categories where key = 'exam_prep'), 'Welchen primären Vorteil bietet die Integration von automatisierten Sicherheitsprüfungen direkt in den Software-Entwicklungsprozess (SDLC)?', ARRAY['Die Dokumentation der Software schreibt sich dadurch von selbst.', 'Die Anwendung wird durch diese Prüfungen automatisch schneller in der Ausführung.', 'Sicherheitslücken können frühzeitig während der Entstehung erkannt und behoben werden, anstatt sie erst im Betrieb mühsam zu flicken.', 'Die Software benötigt nach dem Release keine weiteren Updates mehr.'], 2, 'medium', ARRAY['it_sicherheit', 'softwareentwicklung']::text[], 338),

  ((select id from public.question_categories where key = 'exam_prep'), 'Ein Entwickler bindet eine externe Open-Source-Bibliothek in ein Projekt ein. Welches Risiko muss dabei besonders beachtet werden?', ARRAY['Open-Source-Bibliotheken dürfen laut Gesetz niemals in Firmensoftware genutzt werden.', 'Die Bibliothek könnte bekannte oder unbekannte Sicherheitslücken enthalten, die auf die eigene Anwendung übertragen werden.', 'Die Bibliothek könnte die Farben der Benutzeroberfläche verändern.', 'Die Bibliothek funktioniert nur, wenn der Computer nicht mit dem Internet verbunden ist.'], 1, 'medium', ARRAY['it_sicherheit', 'softwareentwicklung']::text[], 339),

  -- Identitätsmanagement & Überwachung
  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Verfahren erhöht die Sicherheit beim Systemzugang deutlich, indem neben dem Passwort ein zweiter, unabhängiger Faktor verlangt wird?', ARRAY['Symmetrische Verschlüsselung', 'Rollenbasierte Zugriffskontrolle (RBAC)', 'Single Sign-On (SSO)', 'Mehrfaktor-Authentifizierung (MFA)'], 3, 'easy', ARRAY['it_sicherheit']::text[], 340),

  ((select id from public.question_categories where key = 'exam_prep'), 'Welchen Nutzen bietet ein zentrales Logging- oder SIEM-System (Security Information and Event Management) für die IT-Sicherheit?', ARRAY['Es dient primär der Überwachung der Internet-Browserverläufe von Mitarbeitern zu privaten Zwecken.', 'Es ermöglicht die zentrale Nachverfolgung von Zugriffen und die frühzeitige Erkennung von Angriffsmustern durch die Analyse von Protokolldaten.', 'Es verhindert automatisch jeden Stromausfall im Rechenzentrum.', 'Es löscht automatisch alle Daten, die älter als zwei Tage sind.'], 1, 'medium', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 341),

  -- Vertiefung Schutzziele
  ((select id from public.question_categories where key = 'exam_prep'), 'Welches Schutzziel wird primär durch den Einsatz von TLS (Transport Layer Security) und Verschlüsselung bei der Datenübertragung adressiert?', ARRAY['Skalierbarkeit', 'Verfügbarkeit', 'Vertraulichkeit (Schutz vor unbefugtem Mitlesen)', 'Integrität'], 2, 'easy', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 342),

  ((select id from public.question_categories where key = 'exam_prep'), 'Welcher Maßnahme dient die Bereitstellung von redundanten Servern (z. B. in einem Cluster) primär?', ARRAY['Reduzierung der Stromkosten', 'Sicherstellung der Vertraulichkeit', 'Erhöhung der Datenintegrität', 'Sicherstellung der Verfügbarkeit (Schutz vor Systemausfällen)'], 3, 'easy', ARRAY['it_sicherheit', 'netzwerktechnik']::text[], 343);
