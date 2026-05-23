# Orchestrator SEO Priority 3

## Parte 1 - Checklist esecutiva
- [ ] Inventario URL: confronta ogni brief con sitemap, routing e canonical.
- [ ] SERP/competitor: verifica che il competitor table descriva intento, non solo dominio.
- [ ] Keyword plan: controlla primaria, secondarie, entita' e frequenze.
- [ ] Anti-cannibalizzazione: confronta con `CANNIBALIZATION-MATRIX.md` prima di scrivere copy.
- [ ] Revisione editoriale: ogni pagina deve rispondere all'intento nei primi 100-150 parole.
- [ ] Implementazione: modifica title, meta, H1, intro, blocchi, FAQ, CTA, alt e internal links.
- [ ] Structured data: valida WebPage/CollectionPage/Product/TouristTrip/Article/FAQ/Breadcrumb dove previsti.
- [ ] Multilingua: verifica canonical, hreflang e x-default per IT/EN/ES/FR/DE.
- [ ] Build: `docker compose -f docker-compose.prod.yml build app`.
- [ ] QA campioni: homepage, hub esperienze, 8h condiviso, landing skipper, guida Favignana, guida Marettimo.
- [ ] Post deploy: Search Console per index coverage, query, CTR, duplicate/canonical e cannibalizzazione.

## Parte 2 - Prompt agenti

### SEO Strategist
Input: brief pagina + cannibalization matrix.
Output: conferma intento primario, pagine concorrenti interne, priorita' keyword.
Gate: fallisce se due pagine hanno stesso primary intent.

### Competitor Analyst
Input: keyword primaria + 3-5 competitor.
Output: intent SERP, pattern H1/title, elementi ricorrenti, gap sfruttabile.
Gate: fallisce se copia il competitor invece di spiegare differenza Egadisailing.

### Keyword Mapper
Input: brief + glossario.
Output: keyword primaria, secondarie, semantiche, frequenze e posizioni nel layout.
Gate: fallisce se propone keyword non vendute o stuffing.

### On-page Editor
Input: brief approvato.
Output: copy implementabile per title, meta, H1, intro, H2, FAQ, CTA e link.
Gate: fallisce se la pagina non risponde all'intento nei primi 100-150 parole.

### Technical SEO QA
Input: pagina implementata.
Output: controllo canonical, hreflang, schema, sitemap, robots, status code, internal links.
Gate: fallisce se schema non valido o canonical punta a URL sbagliata.

### Final Reviewer
Input: diff implementazione + brief.
Output: approvazione o lista blocchi.
Gate: fallisce se ci sono promesse non supportate, cannibalizzazione o CTA incoerenti.
