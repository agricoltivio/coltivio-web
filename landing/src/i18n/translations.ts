export type Locale = 'de' | 'fr' | 'it' | 'en'

export interface Translations {
  nav: { openApp: string }
  hero: { headline: string; sub: string; testPhase: string; ctaIos: string; ctaAndroid: string }
  story: { headline: string; founders: string; problem: string; born: string; ossTitle: string; oss: string; data: string; funding: string }
  fieldwork: {
    title: string
    sub: string
    plots: { title: string; desc: string }
    protection: { title: string; desc: string }
    harvest: { title: string; desc: string }
    export: { title: string; desc: string }
  }
  animals: {
    title: string
    import: { title: string; desc: string }
    treatments: { title: string; desc: string }
    turnout: { title: string; desc: string }
    export: { title: string; desc: string }
  }
  customize: {
    headline: string
    sub: string
    speedDial: { title: string; desc: string }
    modules: { title: string; desc: string }
  }
  demo: { title: string }
  webapp: {
    label: string
    title: string
    body: string
    contacts: { title: string; desc: string }
    orders: { title: string; desc: string }
    sponsorships: { title: string; desc: string }
  }
  oss: { github: string }
  newsletter: { title: string; sub: string; placeholder: string; cta: string; success: string; error: string }
  footer: { tagline: string; github: string; iosBeta: string; androidBeta: string }
}

const translations: Record<Locale, Translations> = {
  de: {
    nav: { openApp: 'App öffnen' },
    hero: {
      headline: 'Hofverwaltung,\nvon Bauern entwickelt.',
      sub: 'Open-Source Software für kleine und mittlere Betriebe. Keine Investoren, kein Lock-in — nur Werkzeuge, die wirklich funktionieren.',
      testPhase: 'Die App befindet sich derzeit in einer Testphase — probiere sie aus und gib uns dein Feedback.',
      ctaIos: 'iOS TestFlight ↗',
      ctaAndroid: 'Android Beta',
    },
    story: {
      headline: 'Papierkram? Excel-Chaos? Nachtragen am Abend?',
      founders: 'Curdin und Sarah, Berglandwirt:innen, standen täglich vor der Herausforderung: zu viel Dokumentationsaufwand, zu wenig Zeit und keine passende digitale Lösung für Kleinbetriebe.',
      problem: 'Die bestehende Software war kompliziert, oft nur am PC nutzbar – nicht praxistauglich für den Alltag auf dem Hof. Die Lösung war klar: Eine einfache, mobile und effiziente App muss her.',
      born: 'So entstand Coltivio – die Open-Source-App, die Betriebsdokumentation erleichtert und Zeit spart.',
      ossTitle: 'Offen, unabhängig und gemeinsam entwickelt',
      oss: 'Coltivio ist Open Source – das bedeutet, dass nicht nur Landwirt:innen profitieren, sondern auch Entwickler:innen aktiv zur Weiterentwicklung beitragen können. Die App wächst so kontinuierlich, unabhängig und praxisnah, basierend auf den echten Bedürfnissen der Landwirtschaft.',
      data: 'Datensicherheit hat höchste Priorität. Alle Daten werden ausschliesslich auf Servern innerhalb der EU gespeichert und unterliegen den strengen Datenschutzrichtlinien der DSGVO. Da der Quellcode offen einsehbar ist, bleibt Coltivio transparent und überprüfbar – jede:r kann nachvollziehen, wie die Software funktioniert.',
      funding: 'Anstatt auf teure Lizenzen setzen wir auf eine gemeinschaftliche Finanzierung durch freiwillige Beiträge. Jede Unterstützung trägt dazu bei, Coltivio weiterzuentwickeln und für alle Landwirt:innen frei zugänglich zu halten.',
    },
    fieldwork: {
      title: 'Feldarbeit',
      sub: 'Dein Hof in der Hosentasche — Die Mobile App',
      plots: { title: 'Flächenverwaltung', desc: 'Automatische Erfassung deiner Flächen. Passe sie nach deinen Bedürfnissen an — aufteilen, zusammenführen oder neu einzeichnen, ganz wie du es brauchst.' },
      protection: { title: 'Fruchtfolgeplanung', desc: 'Plane deine Fruchtfolgen ganz einfach mit wiederkehrenden Mustern, automatischer Erkennung von Konflikten und Wartezeiten — und sieh das Ergebnis in Echtzeit im Kalender.' },
      harvest: { title: 'Feldarbeiten', desc: 'Erfasse deine Feldarbeiten in wenigen Schritten. Pflügen, Düngeraustrag, Pflanzenschutz oder Ernte — alles sofort erfasst.' },
      export: { title: 'Export', desc: 'Exportiere den Feldkalender für die nächste Kontrolle als optimiertes Excel-File.' },
    },
    animals: {
      title: 'Tierhaltung',
      import: { title: 'Tierbestand', desc: 'Dein ganzer Tierbestand im Überblick. Erstelle Herden mit Auslauf und Weidezeiten. Import der Tiere mittels Tierlisten-Export aus TVD.' },
      treatments: { title: 'Behandlungsjournal', desc: 'Vollständiges Medikamentenprotokoll pro Tier: Präparat, Dosis, Grund und Tierarzt. Milch- und Fleischwartezeiten werden automatisch berechnet und mit Absetzfristen angezeigt.' },
      turnout: { title: 'Auslaufjournal', desc: 'Automatisch generiertes Auslaufjournal basierend auf definierten Herden. Einmal konfiguriert und vergessen.' },
      export: { title: 'Export für Kontrollen', desc: 'Strukturierte Exporte für offizielle Tierkontrollen: Behandlungsprotokoll, Bestandslisten und Auslaufjournal im exakt geforderten Format der Schweizer Behörden.' },
    },
    customize: {
      headline: 'Auf deinen Alltag zugeschnitten — nicht umgekehrt',
      sub: 'Zeit ist knapp auf dem Hof. Coltivio hält sich im Hintergrund — einmal einrichten, den Rest vergessen.',
      speedDial: { title: '4 Schnellzugriff-Aktionen', desc: 'Speichere die vier Aktionen, die du am häufigsten nutzt als Schnellzugriffe auf deinen Homescreen. Erfasse sofort einer Behandlung, Ernte oder Düngeraustrag.' },
      modules: { title: 'Nur anzeigen, was du brauchst', desc: 'Zeige nur die Funktionen an, welche du brauchst. Kein Pflanzenschutz? Kein Problem, einfach ausblenden. Dich interessiert vor allem die Ernte? Ok, schiebe sie ganz nach oben in der Liste. Ganz nach deinen Bedürfnissen.' },
    },
    demo: { title: 'Sieh es in Aktion' },
    webapp: {
      label: 'Wenn das Handy nicht das richtige Werkzeug ist — Die Web App',
      title: 'Die Desktop-Ergänzung',
      body: 'Gleiche Daten, grösserer Bildschirm.',
      contacts: { title: 'Kontaktverwaltung', desc: 'Verwalte alle Hofkontakte. Füge Labels hinzu, um zu wissen, wer sich für ein Fleischpaket interessiert oder bei der Ernte helfen möchte.' },
      orders: { title: 'Einfaches Bestellbuch', desc: 'Erfasse Bestellungen von deinen Kontakten und verfolge, ob sie geliefert und bezahlt wurden.' },
      sponsorships: { title: 'Patenschaftsverwaltung', desc: 'Verwalte deine Tierpatenschaften auf einen Blick: Wer ist Pate welches Tieres, welches Modell läuft — und ist die Zahlung eingegangen? Sende personalisierte Newsletter direkt an alle Paten.' },
    },
    oss: { github: 'Auf GitHub ansehen' },
    newsletter: { title: 'Newsletter', sub: 'Bleib auf dem Laufenden. Wir informieren dich über neue Funktionen, Updates und alles rund um Coltivio.', placeholder: 'deine@email.ch', cta: 'Anmelden', success: 'Danke! Du erhältst in Kürze eine Bestätigungs-E-Mail.', error: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.' },
    footer: { tagline: 'Open-Source Hofverwaltung', github: 'GitHub', iosBeta: 'iOS Beta', androidBeta: 'Android Beta' },
  },

  fr: {
    nav: { openApp: "Ouvrir l'App" },
    hero: {
      headline: 'Gestion agricole,\ncréée par des agriculteurs.',
      sub: "Logiciel open source à but non lucratif pour les petites et moyennes exploitations. Pas d'investisseurs, pas de verrouillage — juste des outils qui fonctionnent vraiment.",
      testPhase: "L'app est actuellement en phase de test — essayez-la et partagez vos retours.",
      ctaIos: 'iOS TestFlight ↗',
      ctaAndroid: 'Android Beta',
    },
    story: {
      headline: 'Paperasse ? Chaos Excel ? Rattrapage le soir ?',
      founders: "Curdin et Sarah, agriculteurs de montagne, faisaient face chaque jour au même défi : trop de documentation, trop peu de temps, et aucun outil numérique vraiment adapté aux petites exploitations.",
      problem: "Les logiciels existants étaient compliqués, souvent utilisables uniquement sur PC — peu pratiques pour le quotidien à la ferme. La réponse était évidente : il fallait créer une app simple, mobile et efficace.",
      born: "C'est ainsi qu'est né Coltivio — l'app open source qui simplifie la documentation agricole, fait gagner du temps et connecte les agriculteurs.",
      ossTitle: 'Ouvert, indépendant et développé ensemble',
      oss: "Coltivio est open source — ce qui signifie que non seulement les agriculteurs en bénéficient, mais aussi que les développeurs peuvent contribuer activement à son évolution. L'app grandit ainsi en continu, de manière indépendante et au plus proche des besoins réels de l'agriculture.",
      data: "La sécurité des données est la priorité absolue. Toutes les données sont stockées exclusivement sur des serveurs au sein de l'UE et soumises aux strictes réglementations RGPD. Le code source étant publiquement visible, Coltivio reste transparent et vérifiable — chacun peut voir exactement comment fonctionne le logiciel.",
      funding: "Plutôt que des licences coûteuses, nous misons sur un financement communautaire par contributions volontaires. Chaque soutien aide Coltivio à se développer et à rester librement accessible à tous les agriculteurs.",
    },
    fieldwork: {
      title: 'Travaux des Champs',
      sub: 'Votre exploitation dans votre poche — L\'App Mobile',
      plots: { title: 'Gestion des surfaces', desc: 'Saisie automatique de vos surfaces. Adaptez-les à vos besoins — divisez, fusionnez ou dessinez de nouvelles parcelles, exactement comme il vous faut.' },
      protection: { title: 'Planification de la rotation des cultures', desc: 'Planifiez vos rotations culturales facilement grâce aux schémas récurrents, la détection automatique des conflits et des violations des délais d\'attente — et visualisez le résultat en temps réel dans le calendrier.' },
      harvest: { title: 'Travaux des champs', desc: "Enregistrez vos travaux des champs en quelques étapes — labour, épandage d'engrais, protection des cultures ou récolte, tout noté immédiatement sur place." },
      export: { title: 'Export', desc: 'Exportez le calendrier des champs sous forme de fichier Excel optimisé, prêt pour votre prochaine inspection officielle.' },
    },
    animals: {
      title: 'Élevage',
      import: { title: 'Cheptel', desc: "Tout votre cheptel en un coup d'œil. Créez des troupeaux avec des sorties et des temps de pâturage définis. Importez les animaux via l'export des listes animaux depuis TVD." },
      treatments: { title: 'Journal des traitements', desc: 'Journal complet des médicaments par animal : produit, dose, motif et vétérinaire. Les délais d\'attente (Absetzfristen) lait et viande sont calculés automatiquement avec alertes avant expiration.' },
      turnout: { title: 'Journal de pâturage', desc: 'Journal de pâturage généré automatiquement en fonction des troupeaux configurés. Configurez-le une fois et oubliez-le.' },
      export: { title: 'Export pour contrôles', desc: 'Exports structurés pour les inspections officielles du cheptel — historique des traitements, listes de troupeaux et registres de pâturage dans le format exact exigé par les autorités suisses.' },
    },
    customize: {
      headline: 'Conçu autour de votre journée — pas l\'inverse',
      sub: 'Le temps est précieux à la ferme. Coltivio s\'efface — configurez-le une fois selon votre façon de travailler et oubliez le reste.',
      speedDial: { title: '4 actions rapides', desc: 'Enregistrez les quatre actions les plus utilisées comme raccourcis sur votre écran d\'accueil. Notez immédiatement un traitement, une récolte ou un épandage d\'engrais.' },
      modules: { title: 'Affichez uniquement ce dont vous avez besoin', desc: 'Affichez uniquement les fonctions dont vous avez besoin. Pas de protection des cultures ? Masquez-la simplement. La récolte est votre priorité ? Remontez-la en tête de liste. Entièrement adapté à vos besoins.' },
    },
    demo: { title: 'Voir en action' },
    webapp: {
      label: "Quand le téléphone n'est pas le bon outil — L'application Web",
      title: 'Le Compagnon Bureau',
      body: 'Mêmes données, écran plus grand.',
      contacts: { title: 'Gestion des contacts', desc: 'Gérez tous vos contacts agricoles. Ajoutez des labels pour savoir qui est intéressé par un colis de viande ou veut aider pendant la récolte.' },
      orders: { title: 'Carnet de commandes', desc: 'Enregistrez les commandes de vos contacts et suivez si elles ont été livrées et payées.' },
      sponsorships: { title: 'Gestion des parrainages', desc: 'Gérez vos parrainages d\'animaux en un coup d\'œil : qui parraine quel animal, quel programme est actif — et le paiement est-il arrivé ? Envoyez des newsletters personnalisées directement à tous les parrains.' },
    },
    oss: { github: 'Voir sur GitHub' },
    newsletter: { title: 'Newsletter', sub: 'Restez informé. Nous vous tiendrons au courant des nouvelles fonctionnalités, mises à jour et tout ce qui concerne Coltivio.', placeholder: 'votre@email.ch', cta: "S'inscrire", success: 'Merci ! Vous recevrez un e-mail de confirmation sous peu.', error: "Une erreur s'est produite. Veuillez réessayer." },
    footer: { tagline: 'Gestion agricole open source', github: 'GitHub', iosBeta: 'iOS Bêta', androidBeta: 'Android Bêta' },
  },

  it: {
    nav: { openApp: 'Apri App' },
    hero: {
      headline: 'Gestione agricola,\nfatta da agricoltori.',
      sub: 'Software open source e senza scopo di lucro per piccole e medie aziende agricole. Nessun investitore, nessun lock-in — solo strumenti che funzionano davvero.',
      testPhase: "L'app è attualmente in fase di test — provala e condividi il tuo feedback.",
      ctaIos: 'iOS TestFlight ↗',
      ctaAndroid: 'Android Beta',
    },
    story: {
      headline: 'Burocrazia? Caos Excel? Aggiornare tutto la sera?',
      founders: "Curdin e Sarah, agricoltori di montagna, affrontavano ogni giorno la stessa sfida: troppa documentazione, troppo poco tempo e nessun strumento digitale adatto alla realtà di una piccola azienda agricola.",
      problem: "Il software esistente era complicato, spesso utilizzabile solo su PC — non pratico per la vita quotidiana in fattoria. La soluzione era evidente: bisognava costruire un'app semplice, mobile ed efficiente.",
      born: "Così è nato Coltivio — l'app open source che semplifica la documentazione agricola, fa risparmiare tempo e mette in rete gli agricoltori.",
      ossTitle: 'Aperto, indipendente e sviluppato insieme',
      oss: "Coltivio è open source — il che significa che non solo gli agricoltori beneficiano del progetto, ma anche gli sviluppatori possono contribuire attivamente alla sua crescita. L'app evolve continuamente, in modo indipendente e vicino alle reali esigenze agricole.",
      data: "La sicurezza dei dati è la massima priorità. Tutti i dati sono archiviati esclusivamente su server all'interno dell'UE e soggetti alle rigide normative GDPR. Poiché il codice sorgente è pubblicamente visibile, Coltivio rimane trasparente e verificabile — chiunque può vedere esattamente come funziona.",
      funding: "Invece di costose licenze, ci affidiamo a un finanziamento comunitario tramite contributi volontari. Ogni sostegno aiuta a far crescere Coltivio e a mantenerlo liberamente accessibile a tutti gli agricoltori.",
    },
    fieldwork: {
      title: 'Lavoro in Campo',
      sub: 'Il tuo podere in tasca — L\'App Mobile',
      plots: { title: 'Gestione delle superfici', desc: 'Acquisizione automatica delle tue superfici. Adattale alle tue esigenze — dividile, uniscile o disegnane di nuove, esattamente come ti serve.' },
      protection: { title: 'Pianificazione della rotazione colturale', desc: 'Pianifica le rotazioni colturali con facilità usando schemi ricorrenti, rilevamento automatico di conflitti e violazioni dei tempi di attesa — e vedi il risultato in tempo reale nel calendario.' },
      harvest: { title: 'Attività di campo', desc: 'Registra le tue attività di campo in pochi passi — aratura, spargimento di fertilizzanti, protezione delle colture o raccolta, tutto catturato immediatamente sul posto.' },
      export: { title: 'Esportazione', desc: 'Esporta il calendario dei campi come file Excel ottimizzato, pronto per la tua prossima ispezione ufficiale.' },
    },
    animals: {
      title: 'Zootecnia',
      import: { title: 'Patrimonio zootecnico', desc: "Tutto il tuo bestiame a colpo d'occhio. Crea mandrie con uscite e tempi di pascolo definiti. Importa gli animali tramite l'esportazione delle liste animali da TVD." },
      treatments: { title: 'Giornale trattamenti', desc: 'Registro completo dei farmaci per animale: prodotto, dose, motivo e veterinario. I periodi di attesa (Absetzfristen) per latte e carne vengono calcolati automaticamente con avvisi prima della scadenza.' },
      turnout: { title: 'Giornale di pascolo', desc: "Giornale di pascolo generato automaticamente in base alle mandrie configurate. Configuralo una volta e lascia fare all'app." },
      export: { title: 'Esporta per controlli', desc: 'Export strutturati per le ispezioni ufficiali del bestiame — storico trattamenti, liste di mandria e registri di pascolo nel formato esatto richiesto dalle autorità svizzere.' },
    },
    customize: {
      headline: 'Pensato per la tua giornata — non il contrario',
      sub: 'Il tempo è prezioso in fattoria. Coltivio rimane in secondo piano — configuralo una volta per adattarsi al tuo flusso di lavoro e dimentica il resto.',
      speedDial: { title: '4 azioni rapide', desc: 'Salva le quattro azioni più usate come scorciatoie nella schermata principale. Registra immediatamente un trattamento, un raccolto o una distribuzione di fertilizzante.' },
      modules: { title: 'Mostra solo ciò che ti serve', desc: 'Mostra solo le funzioni di cui hai bisogno. Nessuna protezione delle colture? Nascondila semplicemente. Il raccolto è la tua priorità? Spostalo in cima alla lista. Tutto adattato alle tue esigenze.' },
    },
    demo: { title: 'Guardalo in azione' },
    webapp: {
      label: "Quando il telefono non è lo strumento giusto — L'app Web",
      title: 'Il Compagno Desktop',
      body: 'Stessi dati, schermo più grande.',
      contacts: { title: 'Gestione contatti', desc: 'Gestisci tutti i tuoi contatti agricoli. Aggiungi etichette per ricordare chi è interessato a un pacco di carne o vuole aiutare durante il raccolto.' },
      orders: { title: 'Registro ordini semplice', desc: 'Aggiungi ordini dai tuoi contatti e traccia se sono stati consegnati e pagati.' },
      sponsorships: { title: 'Gestione sponsorizzazioni', desc: "Gestisci le tue sponsorizzazioni animali a colpo d'occhio: chi sponsorizza quale animale, quale piano è attivo — e il pagamento è arrivato? Invia newsletter personalizzate direttamente a tutti gli sponsor." },
    },
    oss: { github: 'Vedi su GitHub' },
    newsletter: { title: 'Newsletter', sub: 'Rimani aggiornato. Ti terremo informato su nuove funzionalità, aggiornamenti e tutto ciò che riguarda Coltivio.', placeholder: 'tua@email.ch', cta: 'Iscriviti', success: 'Grazie! Riceverai a breve un\'email di conferma.', error: 'Qualcosa è andato storto. Riprova.' },
    footer: { tagline: 'Gestione agricola open source', github: 'GitHub', iosBeta: 'iOS Beta', androidBeta: 'Android Beta' },
  },

  en: {
    nav: { openApp: 'Open App' },
    hero: {
      headline: 'Farm Management,\nBuilt by Farmers.',
      sub: 'Open source, non-profit software for small and medium farms. No investors, no lock-in — just tools that actually work.',
      testPhase: 'The app is currently in a test phase — try it out and share your feedback.',
      ctaIos: 'iOS TestFlight ↗',
      ctaAndroid: 'Android Beta',
    },
    story: {
      headline: 'Paperwork? Excel chaos? Catching up in the evening?',
      founders: 'Curdin and Sarah, mountain farmers, faced the same challenge every day: too much documentation, too little time, and no digital tool that actually fit the reality of a small farm.',
      problem: 'Existing software was complicated, mostly desktop-only — not practical for daily life on the farm. The answer was obvious: a simple, mobile, and efficient app had to be built.',
      born: "That's how Coltivio came to be — the open-source app that makes farm documentation easier, saves time, and connects farmers.",
      ossTitle: 'Open, independent, and built together',
      oss: 'Coltivio is open source — which means not only farmers benefit, but developers can actively contribute to its growth. The app evolves continuously, independently, and close to real farming needs.',
      data: 'Data security is the top priority. All data is stored exclusively on servers within the EU and subject to strict GDPR regulations. Because the source code is publicly visible, Coltivio stays transparent and verifiable — anyone can see exactly how it works.',
      funding: 'Instead of expensive licenses, we rely on community funding through voluntary contributions. Every bit of support helps keep Coltivio growing and freely accessible to all farmers.',
    },
    fieldwork: {
      title: 'Field Work',
      sub: 'Your Farm in Your Pocket — The Mobile App',
      plots: { title: 'Plot Management', desc: 'Automatic capture of your plots. Adjust them to your needs — split, merge or draw new ones, exactly as you need it.' },
      protection: { title: 'Crop Rotation Planning', desc: 'Plan your crop rotations with ease using recurring patterns, conflict and waiting time violation detection, and see the result in real time in the calendar.' },
      harvest: { title: 'Field Activities', desc: 'Log your field activities in just a few steps — ploughing, fertiliser spreading, crop protection or harvest, all captured on the spot.' },
      export: { title: 'Export', desc: 'Export the field calendar as an optimised Excel file, ready for your next official inspection.' },
    },
    animals: {
      title: 'Animal Husbandry',
      import: { title: 'Livestock Overview', desc: 'Your entire livestock at a glance. Create herds with defined turnout and grazing times. Import animals from a TVD herd list export.' },
      treatments: { title: 'Treatments Journal', desc: 'A complete medication log per animal: drug, dose, reason, and vet. Milk and meat withdrawal periods (Absetzfristen) are tracked automatically, with alerts before deadlines pass.' },
      turnout: { title: 'Turnout Journal', desc: 'Automatically generated turnout journal based on your configured herds. Set it up once and let it run.' },
      export: { title: 'Export for Checks', desc: 'One-tap structured exports for official livestock inspections — treatment history, herd lists, and turnout records formatted exactly as required by Swiss authorities.' },
    },
    customize: {
      headline: 'Built Around Your Day, Not the Other Way Around',
      sub: 'Time is scarce on a farm. Coltivio is designed to stay out of your way — configure it once to fit your workflow and forget about the rest.',
      speedDial: { title: '4 Speed Dial Actions', desc: 'Save the four actions you use most as shortcuts on your home screen. Instantly log a treatment, harvest, or fertiliser application.' },
      modules: { title: 'Show Only What You Need', desc: 'Show only the features you need. No crop protection? Just hide it. Harvest is what matters most? Move it to the top of the list. Fully tailored to your needs.' },
    },
    demo: { title: 'See It in Action' },
    webapp: {
      label: "When the Phone Isn't the Right Tool — The Web App",
      title: 'The Desktop Companion',
      body: 'Same data, bigger screen.',
      contacts: { title: 'Contact Management', desc: "Manage all your farm contacts. Add labels to remember who's interested in a meat package or wants to help during harvest." },
      orders: { title: 'Simple Order Book', desc: "Add orders from your contacts and track whether they've been delivered and paid." },
      sponsorships: { title: 'Sponsorship Management', desc: "Manage your animal sponsorships at a glance: who sponsors which animal, which plan is active — and has the payment come in? Send personalised newsletters directly to all sponsors." },
    },
    oss: { github: 'View on GitHub' },
    newsletter: { title: 'Newsletter', sub: "Stay in the loop. We'll keep you updated on new features, releases, and everything Coltivio.", placeholder: 'your@email.com', cta: 'Subscribe', success: "Thanks! You'll receive a confirmation email shortly.", error: 'Something went wrong. Please try again.' },
    footer: { tagline: 'Open source farm management', github: 'GitHub', iosBeta: 'iOS Beta', androidBeta: 'Android Beta' },
  },
}

export function getTranslations(locale: string): Translations {
  return locale in translations ? translations[locale as Locale] : translations.de
}

export const supportedLocales: Locale[] = ['de', 'fr', 'it', 'en']
