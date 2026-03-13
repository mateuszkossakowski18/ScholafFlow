import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TitleProposals {
  traditional: string;
  resultsFocused: string;
  question: string;
  seo: string;
  creative: string;
}

export interface BilingualTitles {
  pl: TitleProposals;
  en: TitleProposals;
}

export interface BilingualKeywords {
  pl: string[];
  en: string[];
}

export interface TitleMasterResult {
  titles: BilingualTitles;
  keywords: BilingualKeywords;
}

export interface PeerReviewResult {
  logicalErrors: string[];
  discussionStrengthening: string;
  styleSuggestions: string[];
}

export interface BiblioItem {
  citation: string;
  bibtex: string;
  justification: string;
  url: string;
  doi: string;
}

export interface SuggestedJournal {
  name: string;
  points: number;
  impactFactor: string;
  discipline: string;
  acceptanceChance: number;
  deadline: string;
  website: string;
  origin: 'PL' | 'INT';
  justification: string;
  apcCost: string;
  isDiamondOA: boolean;
}

export interface AdversarialReviewResult {
  criticalQuestions: {
    question: string;
    suggestion: string;
  }[];
}

export interface ResearchMapNode {
  id: string;
  label: string;
  type: 'author' | 'concept' | 'paper';
  val: number;
}

export interface ResearchMapLink {
  source: string;
  target: string;
}

export interface ResearchMapResult {
  nodes: ResearchMapNode[];
  links: ResearchMapLink[];
}

export interface JournalStrategyResult {
  polish: SuggestedJournal[];
  international: SuggestedJournal[];
}

export interface BibliographyResult {
  polish: BiblioItem[];
  english: BiblioItem[];
}

const MODEL_NAME = "gemini-3-flash-preview";

export const geminiService = {
  async suggestJournals(keywords: string, abstract: string): Promise<JournalStrategyResult> {
    const input = `Keywords: ${keywords || "Not provided"}\nAbstract: ${abstract}`;
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Act as a senior publication strategist. Based on the following research context, suggest 3-5 Polish journals (from the LATEST 2024/2025 MEiN list evaluation) and 3-5 International journals (Scimago/JCR) that are the best fit for this article.
      
      For each journal, provide:
      1. Name
      2. MEiN points (based on the latest 2024/2025 evaluation list: 20, 40, 70, 100, 140, or 200 pts).
      3. Impact Factor (if available).
      4. Estimated publication chance (0-100%) based on topic fit and typical acceptance rates.
      5. Next submission deadline (use Google Search to find current info if possible, otherwise state 'Rolling' or 'Check website').
      6. Official MAIN homepage URL (root address, e.g., https://www.nature.com/ - NOT a specific article or subpage).
      7. Origin: 'PL' for Polish, 'INT' for International.
      8. A short justification in Polish why this journal is a good fit.
      9. Estimated APC (Article Processing Charge) cost in USD or EUR.
      10. isDiamondOA: true if it's a Diamond Open Access journal (no fees for authors), false otherwise.
      
      Context:
      ${input}
      
      IMPORTANT: Return ONLY a valid JSON object with the following structure:
      {
        "polish": [
          { "name": "...", "points": 100, "impactFactor": "...", "discipline": "...", "acceptanceChance": 25, "deadline": "...", "website": "...", "origin": "PL", "justification": "...", "apcCost": "$0", "isDiamondOA": true }
        ],
        "international": [
          { "name": "...", "points": 0, "impactFactor": "...", "discipline": "...", "acceptanceChance": 15, "deadline": "...", "website": "...", "origin": "INT", "justification": "...", "apcCost": "$3000", "isDiamondOA": false }
        ]
      }`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse journal strategy JSON:", e, text);
      return { polish: [], international: [] };
    }
  },

  async generateTitleMaster(keywords: string, abstract: string): Promise<TitleMasterResult> {
    const inputKeywords = keywords || "Not provided (infer from abstract)";
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate 5 research paper titles and 5-8 keywords in both Polish and English based on the following input.
      Keywords: ${inputKeywords}
      Abstract: ${abstract}
      
      If keywords were not provided, infer the most relevant ones from the abstract.
      The titles should follow these types: traditional, resultsFocused, question, seo, creative.
      Return as JSON with keys: 
      titles: { pl: { traditional, resultsFocused, question, seo, creative }, en: { traditional, resultsFocused, question, seo, creative } },
      keywords: { pl: [string], en: [string] }.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.OBJECT,
              properties: {
                pl: {
                  type: Type.OBJECT,
                  properties: {
                    traditional: { type: Type.STRING },
                    resultsFocused: { type: Type.STRING },
                    question: { type: Type.STRING },
                    seo: { type: Type.STRING },
                    creative: { type: Type.STRING },
                  },
                  required: ["traditional", "resultsFocused", "question", "seo", "creative"],
                },
                en: {
                  type: Type.OBJECT,
                  properties: {
                    traditional: { type: Type.STRING },
                    resultsFocused: { type: Type.STRING },
                    question: { type: Type.STRING },
                    seo: { type: Type.STRING },
                    creative: { type: Type.STRING },
                  },
                  required: ["traditional", "resultsFocused", "question", "seo", "creative"],
                },
              },
              required: ["pl", "en"],
            },
            keywords: {
              type: Type.OBJECT,
              properties: {
                pl: { type: Type.ARRAY, items: { type: Type.STRING } },
                en: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ["pl", "en"],
            },
          },
          required: ["titles", "keywords"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  },

  async analyzePeerReview(text: string): Promise<PeerReviewResult> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Act as a senior academic peer reviewer. Analyze this text for logical errors, suggest improvements for the discussion section, and provide academic style suggestions (Academic Phrasebank style).
      The analysis should be in Polish.
      Text: ${text}
      Return as JSON with keys: logicalErrors (array), discussionStrengthening (string), styleSuggestions (array).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            logicalErrors: { type: Type.ARRAY, items: { type: Type.STRING } },
            discussionStrengthening: { type: Type.STRING },
            styleSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["logicalErrors", "discussionStrengthening", "styleSuggestions"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  },

  async performAdversarialReview(abstract: string): Promise<AdversarialReviewResult> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Act as a critical reviewer (Adversarial Review). Generate 3 critical questions regarding the methodology described in the abstract and suggest how to address them in the text to strengthen the paper.
      The response should be in Polish.
      Abstract: ${abstract}
      Return as JSON with key: criticalQuestions (array of objects with 'question' and 'suggestion').`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criticalQuestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  suggestion: { type: Type.STRING },
                },
                required: ["question", "suggestion"],
              },
            },
          },
          required: ["criticalQuestions"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  },

  async applyReviewChanges(abstract: string, review: PeerReviewResult, adversarial: AdversarialReviewResult): Promise<string> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Rewrite the following abstract by incorporating the suggestions from the peer review and adversarial review.
      Original Abstract: ${abstract}
      Peer Review Suggestions: ${JSON.stringify(review)}
      Adversarial Review Suggestions: ${JSON.stringify(adversarial)}
      
      The rewritten abstract should be in Polish, professional, and academically sound.
      Return ONLY the rewritten text.`,
    });
    return response.text || abstract;
  },

  async generateResearchMap(abstract: string, bibliography: BiblioItem[]): Promise<ResearchMapResult> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Based on the following abstract and bibliography, generate a visual research map data structure. 
      Identify "big names" (key authors), main schools of thought (concepts), and how they connect to the current research.
      
      Abstract: ${abstract}
      Bibliography: ${JSON.stringify(bibliography.map(b => b.citation))}
      
      Return as JSON with keys: nodes (array of {id, label, type, val}), links (array of {source, target}).
      Types: 'author', 'concept', 'paper'. 'val' is importance (1-10).
      Ensure the current research is a node with id 'current'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  val: { type: Type.NUMBER },
                },
                required: ["id", "label", "type", "val"],
              },
            },
            links: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                },
                required: ["source", "target"],
              },
            },
          },
          required: ["nodes", "links"],
        },
      },
    });
    return JSON.parse(response.text || '{"nodes":[], "links":[]}');
  },

  async searchBibliography(topic: string, abstract: string): Promise<BibliographyResult> {
    const query = topic || abstract.substring(0, 300);
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Find exactly 10-12 key real-world academic publications in POLISH and 10-12 in ENGLISH (total 20-24) for the following research topic/abstract.
      Topic/Context: "${query}"
      
      For each publication, provide:
      1. A formatted citation string (Author, Year, Title, Journal/Publisher).
      2. A valid BibTeX entry.
      3. A short justification (in Polish) of why it's critical for a literature review.
      4. A URL to a place where this publication can be found or read (e.g., Google Scholar, JSTOR, Publisher site, ResearchGate, arXiv).
      5. DOI (if available).
      
      IMPORTANT: Return ONLY a valid JSON object with the following structure:
      {
        "polish": [
          { "citation": "...", "bibtex": "...", "justification": "...", "url": "...", "doi": "..." }
        ],
        "english": [
          { "citation": "...", "bibtex": "...", "justification": "...", "url": "...", "doi": "..." }
        ]
      }`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "{}";
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse bibliography JSON:", e, text);
      return { polish: [], english: [] };
    }
  },

  async searchSpecializedDatabases(query: string, source: string): Promise<BiblioItem[]> {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Search for the 5 most relevant academic publications for the query "${query}" specifically in the ${source} database.
      Use Google Search to find real, existing publications from ${source}.
      
      For each publication, provide:
      1. A formatted citation string.
      2. A valid BibTeX entry.
      3. A short justification (in Polish).
      4. A direct URL to the publication on ${source} or a reliable academic site.
      5. DOI (if available).
      
      Return as a JSON array of objects: [{ citation, bibtex, justification, url, doi }].`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              citation: { type: Type.STRING },
              bibtex: { type: Type.STRING },
              justification: { type: Type.STRING },
              url: { type: Type.STRING },
              doi: { type: Type.STRING },
            },
            required: ["citation", "bibtex", "justification", "url"],
          },
        },
      },
    });

    try {
      return JSON.parse(response.text || "[]");
    } catch (e) {
      console.error(`Failed to parse specialized search JSON for ${source}:`, e);
      return [];
    }
  }
};
