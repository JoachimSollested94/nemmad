# NemMad 🍲

Dansk madlavnings-app: browse opskrifter, kør **cooking mode** med indbygget
timer, og saml en **indkøbsliste** på tværs af flere opskrifter. Du kan tilføje
dine egne opskrifter **gratis** ved at indsætte et link — appen henter
opskriften fra sidens strukturerede data (schema.org). Ingen AI, ingen
API-nøgle, ingen omkostning.

## Sådan virker link-import

1. Frontend sender linket til `/api/import-recipe`.
2. Backend'en henter siden server-side (løser CORS) og parser opskriften fra
   **JSON-LD** eller **microdata** (`schema.org/Recipe`) — se `lib/recipe-parser.ts`.
3. Ingredienser, mængder, tider og trin normaliseres til appens format og vises
   på en tjek-skærm, før du gemmer.

Sider uden schema.org-opskriftsdata kan ikke importeres og giver en pæn fejl.
Gemte opskrifter ligger i browserens `localStorage`.

## Kør lokalt

```bash
npm install
npm run dev
# åbn http://localhost:3000
```

Kør parser-testene:

```bash
npm test
```

## Deploy gratis (Vercel)

1. Læg projektet i et Git-repo (GitHub/GitLab).
2. Importér det på [vercel.com](https://vercel.com) → framework detekteres som
   Next.js automatisk.
3. Deploy. Ingen miljøvariabler er nødvendige — der bruges ingen betalte tjenester.

Netlify virker tilsvarende (vælg Next.js-runtime).

## Teknik

- **Next.js (App Router)** — frontend + `/api/import-recipe` i ét repo.
- **cheerio** — server-side HTML-parsing.
- **Tailwind CSS** — layout-utilities (design-farver ligger som inline tokens i `app/CookingModeApp.jsx`).
- **lucide-react** — ikoner.

## Tilpasning

Kategori-gæt og enheder styres af `CATEGORY_KEYWORDS` og `UNIT_ALIASES` øverst i
`lib/recipe-parser.ts` — tilføj gerne flere danske ord for bedre sortering af
indkøbslisten.
