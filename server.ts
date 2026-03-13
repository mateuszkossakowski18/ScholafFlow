import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("scholarflow.db");

// Initialize database with expanded journal data
db.exec(`
  CREATE TABLE IF NOT EXISTS journals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    points INTEGER,
    impact_factor REAL,
    discipline TEXT,
    acceptance_rate REAL,
    next_deadline TEXT
  )
`);

// Seed more data if empty
const count = db.prepare("SELECT count(*) as count FROM journals").get() as { count: number };
if (count.count === 0) {
  const insert = db.prepare("INSERT INTO journals (name, points, impact_factor, discipline, acceptance_rate, next_deadline) VALUES (?, ?, ?, ?, ?, ?)");
  
  // High tier
  insert.run("Nature", 200, 64.8, "Multidisciplinary", 7, "2026-04-15");
  insert.run("Science", 200, 56.9, "Multidisciplinary", 6, "2026-05-01");
  insert.run("The Lancet", 200, 202.7, "Medicine", 5, "Rolling");
  
  // CS/Tech
  insert.run("IEEE Transactions on Pattern Analysis and Machine Intelligence", 200, 23.6, "Computer Science", 12, "2026-06-30");
  insert.run("ACM Computing Surveys", 200, 16.6, "Computer Science", 15, "2026-08-15");
  insert.run("Journal of Machine Learning Research", 140, 5.1, "AI/ML", 20, "Rolling");
  
  // Mid tier / Less popular (Higher acceptance)
  insert.run("Applied Sciences", 100, 2.7, "Engineering", 45, "2026-03-25");
  insert.run("Sustainability", 100, 3.9, "Environmental", 38, "2026-04-10");
  insert.run("Sensors", 100, 3.8, "Technology", 42, "2026-03-20");
  insert.run("PLOS ONE", 140, 3.7, "Multidisciplinary", 48, "Rolling");
  
  // Polish / Specific - Latest MEiN (2024/2025)
  insert.run("Studia Logica", 100, 0.8, "Philosophy/Logic", 25, "2026-09-01");
  insert.run("Bulletin of the Polish Academy of Sciences: Technical Sciences", 100, 1.6, "Engineering", 30, "2026-05-15");
  insert.run("Archives of Control Sciences", 70, 1.2, "Automation", 35, "2026-07-10");
  insert.run("Foundations of Computing and Decision Sciences", 40, 0.9, "Computer Science", 40, "2026-06-01");
  
  // New MEiN 2024/2025 entries
  insert.run("Ekonomia i Prawo. Economics and Law", 100, 0.5, "Economics/Law", 28, "2026-04-30");
  insert.run("Gospodarka Narodowa. The Polish Journal of Economics", 100, 0.7, "Economics", 22, "2026-05-20");
  insert.run("Przegląd Elektrotechniczny", 40, 0.4, "Electrical Engineering", 45, "Rolling");
  insert.run("Medycyna Pracy", 70, 1.1, "Medicine", 32, "2026-04-15");
  insert.run("Ruch Prawniczy, Ekonomiczny i Socjologiczny", 100, 0.6, "Law/Economics/Sociology", 18, "2026-06-15");
  insert.run("Polityka Społeczna", 70, 0.3, "Social Policy", 35, "2026-05-10");
  insert.run("Zeszyty Teoretyczne Rachunkowości", 100, 0.4, "Accounting", 25, "2026-08-20");
  insert.run("Annales Universitatis Mariae Curie-Skłodowska, sectio H – Oeconomia", 70, 0.3, "Economics", 30, "2026-07-01");
  insert.run("Problemy Zarządzania", 100, 0.5, "Management", 24, "2026-09-15");
  insert.run("Kwartalnik Nauk o Przedsiębiorstwie", 70, 0.2, "Management", 38, "2026-06-30");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/journals", (req, res) => {
    const query = req.query.q as string;
    if (query) {
      const results = db.prepare("SELECT * FROM journals WHERE name LIKE ? OR discipline LIKE ?")
        .all(`%${query}%`, `%${query}%`);
      res.json(results);
    } else {
      const results = db.prepare("SELECT * FROM journals LIMIT 20").all();
      res.json(results);
    }
  });

  app.get("/api/academic/search", async (req, res) => {
    const { query, source } = req.query;
    if (!query || !source) {
      return res.status(400).json({ error: "Missing query or source" });
    }

    try {
      let url = "";
      if (source === "openalex") {
        url = `https://api.openalex.org/works?search=${encodeURIComponent(query as string)}&per_page=10`;
      } else if (source === "semanticscholar") {
        url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query as string)}&limit=10&fields=title,authors,year,url,externalIds`;
      } else if (source === "scopus") {
        const apiKey = process.env.SCOPUS_API_KEY;
        if (!apiKey) {
          console.warn("Scopus API key missing. Skipping source.");
          return res.json({ message: "Scopus API key missing", results: [] });
        }
        url = `https://api.elsevier.com/content/search/scopus?query=${encodeURIComponent(query as string)}&count=10`;
      } else if (source === "wos") {
        const apiKey = process.env.WOS_API_KEY;
        if (!apiKey) {
          console.warn("Web of Science API key missing. Skipping source.");
          return res.json({ message: "Web of Science API key missing", results: [] });
        }
        url = `https://api.clarivate.com/api/wos?databaseId=WOS&usrQuery=${encodeURIComponent(query as string)}&count=10&firstRecord=1`;
      } else if (source === "googlescholar" || source === "bazekon" || source === "baztech" || source === "cejsh") {
        // These don't have straightforward public APIs, so we'll use a search-based approach or specialized endpoints if they existed.
        // For this implementation, we'll proxy to a search result page or use a placeholder that we'll handle in the frontend with Gemini search grounding.
        return res.json({ message: "Search redirected to AI grounding", source });
      } else {
        return res.status(400).json({ error: "Invalid source" });
      }

      const headers: Record<string, string> = {
        'User-Agent': 'ScholarFlow/1.0 (mailto:mateusz.kossakowski18@gmail.com)'
      };

      if (source === "scopus") {
        headers['X-ELS-APIKey'] = process.env.SCOPUS_API_KEY!;
      } else if (source === "wos") {
        headers['X-ApiKey'] = process.env.WOS_API_KEY!;
      }

      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error(`Academic API error [${source}]: ${response.status} ${response.statusText} - ${errorText}`);
        
        // If unauthorized, return empty results instead of crashing the frontend
        if (response.status === 401 || response.status === 403) {
          return res.json({ message: `Access denied for ${source} (check API key)`, results: [] });
        }
        
        throw new Error(`Academic API error: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error(`Proxy search failed for ${source}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
