import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  FileText, 
  Award, 
  Sparkles, 
  AlertCircle, 
  ChevronRight,
  Database,
  Quote,
  Loader2,
  Globe,
  Calendar,
  Target,
  ShieldAlert,
  Network,
  DollarSign,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { 
  geminiService, 
  TitleMasterResult, 
  PeerReviewResult, 
  BiblioItem, 
  JournalStrategyResult, 
  SuggestedJournal,
  AdversarialReviewResult,
  ResearchMapResult,
  BibliographyResult
} from './services/geminiService';
import { academicApiService, AcademicWork } from './services/academicApi';
import Markdown from 'react-markdown';
import * as d3 from 'd3';

function ResearchMap({ data }: { data: ResearchMapResult }) {
  const svgRef = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const width = 800;
    const height = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation(data.nodes as any)
      .force("link", d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#333")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 1);

    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(d3.drag<any, any>()
        .on("start", (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }) as any);

    node.append("circle")
      .attr("r", (d: any) => d.val * 2 + 5)
      .attr("fill", (d: any) => {
        if (d.id === 'current') return "#10b981";
        if (d.type === 'author') return "#6366f1";
        if (d.type === 'concept') return "#f59e0b";
        return "#6b7280";
      });

    node.append("text")
      .text((d: any) => d.label)
      .attr("x", 12)
      .attr("y", 4)
      .attr("fill", "#fff")
      .style("font-size", "10px")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { simulation.stop(); };
  }, [data]);

  return (
    <div className="scientific-glass p-4 overflow-hidden bg-black/40">
      <svg ref={svgRef} width="100%" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" />
      <div className="flex gap-4 mt-4 text-[10px] uppercase tracking-widest font-bold text-gray-500 justify-center">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#10b981]"></div> Twoja Praca</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#6366f1]"></div> Autorzy</div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#f59e0b]"></div> Koncepcje</div>
      </div>
    </div>
  );
}

interface Journal {
  id: number;
  name: string;
  points: number;
  impact_factor: number;
  discipline: string;
  acceptance_rate: number;
  next_deadline: string;
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-scientific-accent/10 text-scientific-accent' 
          : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

function SectionHeader({ title, description }: { title: string, description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-white tracking-tight">{title}</h2>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}

function TitleCard({ type, title }: { type: string, title: string }) {
  return (
    <div className="scientific-glass p-4 group hover:border-scientific-accent transition-all cursor-pointer">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-scientific-accent/70">{type}</span>
        <Sparkles size={14} className="text-scientific-accent opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <h3 className="text-lg font-medium text-white group-hover:text-scientific-accent transition-colors">{title}</h3>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="scientific-glass p-12 flex flex-col items-center justify-center text-center space-y-4 border-dashed">
      <div className="w-16 h-16 bg-scientific-border rounded-full flex items-center justify-center">
        <Loader2 className="text-gray-600" size={32} />
      </div>
      <p className="text-gray-500 max-w-xs">{message}</p>
    </div>
  );
}

function AiJournalCard({ journal }: { journal: SuggestedJournal; key?: React.Key }) {
  const getChanceColor = (rate: number) => {
    if (rate < 15) return 'text-red-400';
    if (rate < 35) return 'text-orange-400';
    return 'text-emerald-400';
  };

  return (
    <div className="scientific-glass p-6 space-y-4 border-l-4 border-l-scientific-accent group hover:bg-white/5 transition-all">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-white group-hover:text-scientific-accent transition-colors">{journal.name}</h3>
          <p className="text-sm text-gray-400">{journal.discipline}</p>
        </div>
        <div className="flex items-center gap-6 shrink-0">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Punkty / IF</p>
            <p className="text-lg font-bold text-white">{journal.points} pkt / {journal.impactFactor}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Szansa</p>
            <p className={`text-lg font-bold ${getChanceColor(journal.acceptanceChance)}`}>{journal.acceptanceChance}%</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-2 text-sm text-gray-300 bg-scientific-dark/50 p-3 rounded-lg border border-scientific-border">
          <Calendar size={16} className="text-scientific-accent" />
          <span className="font-medium">Deadline:</span>
          <span className="text-white">{journal.deadline}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm bg-scientific-dark/50 p-3 rounded-lg border ${journal.isDiamondOA ? 'border-emerald-500/50 text-emerald-400' : 'border-scientific-border text-gray-300'}`}>
          <DollarSign size={16} className={journal.isDiamondOA ? 'text-emerald-400' : 'text-scientific-accent'} />
          <span className="font-medium">APC:</span>
          <span className="font-bold">{journal.isDiamondOA ? 'Diamond OA (Free)' : journal.apcCost}</span>
        </div>
        {journal.website && (
          <a 
            href={journal.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-gray-300 bg-scientific-dark/50 p-3 rounded-lg border border-scientific-border hover:border-scientific-accent transition-colors"
          >
            <Globe size={16} className="text-scientific-accent" />
            <span className="font-medium">Strona WWW</span>
            <ChevronRight size={14} className="ml-auto" />
          </a>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Dlaczego to czasopismo?</p>
        <p className="text-sm text-gray-400 leading-relaxed italic">"{journal.justification}"</p>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'titles' | 'journals' | 'biblio' | 'review' | 'map'>('titles');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');

  // Results state
  const [titleMaster, setTitleMaster] = useState<TitleMasterResult | null>(null);
  const [journals, setJournals] = useState<Journal[]>([]);
  const [aiJournals, setAiJournals] = useState<JournalStrategyResult | null>(null);
  const [biblio, setBiblio] = useState<BibliographyResult | null>(null);
  const [review, setReview] = useState<PeerReviewResult | null>(null);
  const [adversarial, setAdversarial] = useState<AdversarialReviewResult | null>(null);
  const [researchMap, setResearchMap] = useState<ResearchMapResult | null>(null);
  const [academicWorks, setAcademicWorks] = useState<AcademicWork[]>([]);

  const handleProcessAll = async () => {
    if (!abstract) return;
    setLoading(true);
    
    // Reset previous results to show fresh progress
    setTitleMaster(null);
    setAiJournals(null);
    setBiblio(null);
    setReview(null);
    setAdversarial(null);
    setResearchMap(null);
    setAcademicWorks([]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    try {
      // Execute sequentially with small delays to respect rate limits
      setProgressMsg('Generowanie tytułów i słów kluczowych...');
      const titlesRes = await geminiService.generateTitleMaster(keywords, abstract);
      setTitleMaster(titlesRes);
      await delay(1000);

      setProgressMsg('Analiza strategii czasopism i kosztów APC...');
      const journalsRes = await geminiService.suggestJournals(keywords, abstract);
      setAiJournals(journalsRes);
      await delay(1000);

      setProgressMsg('Wyszukiwanie publikacji (OpenAlex, Semantic Scholar, Scopus, WoS, Google Scholar, BazEkon, BazTech, CEJSH)...');
      const query = keywords || abstract.substring(0, 100);
      
      const [
        biblioRes, 
        openAlexRes, 
        semanticRes, 
        scopusRes, 
        wosRes,
        gsRes,
        bazEkonRes,
        bazTechRes,
        cejshRes
      ] = await Promise.all([
        geminiService.searchBibliography(keywords, abstract),
        academicApiService.searchOpenAlex(query),
        academicApiService.searchSemanticScholar(query),
        academicApiService.searchScopus(query).catch(() => []),
        academicApiService.searchWebOfScience(query).catch(() => []),
        geminiService.searchSpecializedDatabases(query, 'Google Scholar').catch(() => []),
        geminiService.searchSpecializedDatabases(query, 'BazEkon').catch(() => []),
        geminiService.searchSpecializedDatabases(query, 'BazTech').catch(() => []),
        geminiService.searchSpecializedDatabases(query, 'CEJSH').catch(() => [])
      ]);

      setBiblio(biblioRes);
      
      // Convert specialized results to AcademicWork format
      const convertToWork = (items: any[], source: any): AcademicWork[] => 
        items.map(item => ({
          id: item.doi || item.url,
          title: item.citation.split('(')[0].trim(),
          author: item.citation.split(')')[1]?.trim() || 'Unknown',
          year: parseInt(item.citation.match(/\((\d{4})\)/)?.[1] || '0'),
          url: item.url,
          doi: item.doi,
          source: source
        }));

      setAcademicWorks([
        ...openAlexRes, 
        ...semanticRes, 
        ...scopusRes, 
        ...wosRes,
        ...convertToWork(gsRes, 'GoogleScholar'),
        ...convertToWork(bazEkonRes, 'BazEkon'),
        ...convertToWork(bazTechRes, 'BazTech'),
        ...convertToWork(cejshRes, 'CEJSH')
      ]);
      await delay(1000);

      setProgressMsg('Generowanie Adversarial Review (Metodologia)...');
      const adversarialRes = await geminiService.performAdversarialReview(abstract);
      setAdversarial(adversarialRes);
      await delay(1000);

      setProgressMsg('Analiza recenzji AI i stylu...');
      const reviewRes = await geminiService.analyzePeerReview(abstract);
      setReview(reviewRes);
      await delay(1000);

      setProgressMsg('Tworzenie wizualnej mapy badań...');
      const mapRes = await geminiService.generateResearchMap(abstract, [...biblioRes.polish, ...biblioRes.english]);
      setResearchMap(mapRes);

    } catch (error: any) {
      console.error("Error processing analyses:", error);
      if (error?.message?.includes('429') || error?.message?.includes('quota')) {
        alert("Przekroczono limit zapytań AI (Quota Exceeded). Proszę odczekać chwilę i spróbować ponownie.");
      }
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const handleApplyChanges = async () => {
    if (!abstract || !review || !adversarial) return;
    setLoading(true);
    setProgressMsg('Wdrażanie sugerowanych zmian w abstrakcie...');
    try {
      const newAbstract = await geminiService.applyReviewChanges(abstract, review, adversarial);
      setAbstract(newAbstract);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setProgressMsg('');
    }
  };

  const handleSearchJournals = async (query: string) => {
    const res = await fetch(`/api/journals?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    setJournals(data);
  };

  const handleSearchBiblio = async () => {
    if (!abstract && !keywords) return;
    setLoading(true);
    try {
      const res = await geminiService.searchBibliography(keywords, abstract);
      setBiblio(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeerReview = async () => {
    if (!abstract) return;
    setLoading(true);
    try {
      const res = await geminiService.analyzePeerReview(abstract);
      setReview(res);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearchJournals('');
  }, []);

  const getChanceColor = (rate: number) => {
    if (rate < 15) return 'text-red-400';
    if (rate < 35) return 'text-orange-400';
    return 'text-emerald-400';
  };

  return (
    <div className="min-h-screen bg-scientific-dark text-gray-200 selection:bg-scientific-accent/30">
      {/* Header */}
      <header className="border-b border-scientific-border bg-scientific-dark/50 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-scientific-accent rounded-lg flex items-center justify-center">
              <Sparkles className="text-scientific-dark w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">ScholarFlow</h1>
          </div>
          <nav className="flex gap-1">
            <TabButton active={activeTab === 'titles'} onClick={() => setActiveTab('titles')} icon={<Sparkles size={16} />} label="Generator" />
            <TabButton active={activeTab === 'journals'} onClick={() => setActiveTab('journals')} icon={<Award size={16} />} label="Strategia" />
            <TabButton active={activeTab === 'biblio'} onClick={() => setActiveTab('biblio')} icon={<BookOpen size={16} />} label="Biblio" />
            <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={<FileText size={16} />} label="Recenzja" />
            <TabButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<Network size={16} />} label="Mapa Badań" />
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="scientific-glass p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Database size={18} className="text-scientific-accent" />
                Kontekst Badawczy
              </h2>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Słowa Kluczowe (Opcjonalnie)</label>
                <input 
                  type="text" 
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="np. uczenie głębokie, zmiany klimatu, logika"
                  className="w-full bg-scientific-dark border border-scientific-border rounded-lg px-4 py-2 focus:ring-2 focus:ring-scientific-accent focus:border-transparent outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-gray-400 uppercase tracking-wider">Abstrakt / Szkic (Wymagane)</label>
                <textarea 
                  value={abstract}
                  onChange={(e) => setAbstract(e.target.value)}
                  placeholder="Wklej swój abstrakt lub wstępny szkic tutaj..."
                  className="w-full bg-scientific-dark border border-scientific-border rounded-lg px-4 py-2 h-48 focus:ring-2 focus:ring-scientific-accent focus:border-transparent outline-none transition-all resize-none"
                />
              </div>
              <button 
                onClick={handleProcessAll}
                disabled={loading || !abstract}
                className="w-full bg-scientific-accent hover:bg-scientific-accent/90 text-scientific-dark font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                Przetwarzaj Całość przez AI
              </button>
              {loading && progressMsg && (
                <p className="text-[10px] text-scientific-accent text-center font-bold uppercase tracking-widest animate-pulse">
                  {progressMsg}
                </p>
              )}
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'titles' && (
                <motion.div 
                  key="titles"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <SectionHeader title="Propozycje Tytułów i Słów Kluczowych" description="Dwujęzyczne propozycje zoptymalizowane pod różne cele akademickie." />
                  {titleMaster ? (
                    <div className="space-y-8">
                      {/* Polish Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-scientific-accent font-bold uppercase tracking-widest text-xs">
                          <Globe size={14} /> Język Polski
                        </div>
                        <div className="grid gap-4">
                          <TitleCard type="Tradycyjny" title={titleMaster.titles.pl.traditional} />
                          <TitleCard type="Skupiony na wynikach" title={titleMaster.titles.pl.resultsFocused} />
                          <TitleCard type="Pytający" title={titleMaster.titles.pl.question} />
                          <TitleCard type="SEO (Cytowania)" title={titleMaster.titles.pl.seo} />
                          <TitleCard type="Kreatywny" title={titleMaster.titles.pl.creative} />
                        </div>
                        <div className="scientific-glass p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Słowa Kluczowe (PL)</p>
                          <div className="flex flex-wrap gap-2">
                            {titleMaster.keywords.pl.map((kw, i) => (
                              <span key={i} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm">{kw}</span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* English Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-scientific-accent font-bold uppercase tracking-widest text-xs">
                          <Globe size={14} /> English Language
                        </div>
                        <div className="grid gap-4">
                          <TitleCard type="Traditional" title={titleMaster.titles.en.traditional} />
                          <TitleCard type="Results-Focused" title={titleMaster.titles.en.resultsFocused} />
                          <TitleCard type="Question" title={titleMaster.titles.en.question} />
                          <TitleCard type="SEO Optimized" title={titleMaster.titles.en.seo} />
                          <TitleCard type="Creative" title={titleMaster.titles.en.creative} />
                        </div>
                        <div className="scientific-glass p-4">
                          <p className="text-xs font-bold text-gray-500 uppercase mb-2">Keywords (EN)</p>
                          <div className="flex flex-wrap gap-2">
                            {titleMaster.keywords.en.map((kw, i) => (
                              <span key={i} className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-sm">{kw}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <EmptyState message="Wprowadź abstrakt, aby wygenerować propozycje." />
                  )}
                </motion.div>
              )}

              {activeTab === 'journals' && (
                <motion.div 
                  key="journals"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <SectionHeader title="Strategia Czasopism" description="AI analizuje Twój abstrakt i sugeruje najlepsze miejsca na publikację." />
                  
                  {aiJournals ? (
                    <div className="space-y-10">
                      {/* Polish Journals */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-scientific-accent font-bold uppercase tracking-widest text-xs">
                          <Globe size={14} /> Czasopisma Polskie (MEiN)
                        </div>
                        <div className="grid gap-4">
                          {aiJournals.polish.map((j, i) => (
                            <AiJournalCard key={i} journal={j} />
                          ))}
                        </div>
                      </div>

                      {/* International Journals */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-scientific-accent font-bold uppercase tracking-widest text-xs">
                          <Globe size={14} /> International Journals (Scimago/JCR)
                        </div>
                        <div className="grid gap-4">
                          {aiJournals.international.map((j, i) => (
                            <AiJournalCard key={i} journal={j} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="scientific-glass p-8 text-center border-dashed border-scientific-accent/30">
                        <p className="text-gray-400 mb-4">Kliknij "Przetwarzaj przez AI", aby otrzymać spersonalizowaną strategię publikacji.</p>
                      </div>
                      
                      <div className="pt-8 border-t border-scientific-border">
                        <p className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest">Wyszukiwarka Bazy Danych</p>
                        <div className="relative mb-4">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                          <input 
                            type="text"
                            placeholder="Szukaj czasopism po nazwie lub dyscyplinie..."
                            onChange={(e) => handleSearchJournals(e.target.value)}
                            className="w-full bg-scientific-card border border-scientific-border rounded-xl pl-10 pr-4 py-3 focus:ring-2 focus:ring-scientific-accent outline-none"
                          />
                        </div>
                        <div className="grid gap-4">
                          {journals.map(j => (
                            <div key={j.id} className="scientific-glass p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-scientific-accent transition-colors">
                              <div className="space-y-1">
                                <h3 className="font-semibold text-white text-lg">{j.name}</h3>
                                <p className="text-sm text-gray-400">{j.discipline}</p>
                                <div className="flex items-center gap-4 mt-2">
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Target size={14} />
                                    Szansa: <span className={`font-bold ${getChanceColor(j.acceptance_rate)}`}>{j.acceptance_rate}%</span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar size={14} />
                                    Deadline: <span className="text-white font-medium">{j.next_deadline}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 border-t md:border-t-0 border-scientific-border pt-4 md:pt-0">
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Punkty MEiN</p>
                                  <p className="text-xl font-bold text-scientific-accent">{j.points}</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">Impact Factor</p>
                                  <p className="text-xl font-bold text-white">{j.impact_factor}</p>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-scientific-accent transition-colors hidden md:block" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'biblio' && (
                <motion.div 
                  key="biblio"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <SectionHeader title="Wyszukiwarka Bibliografii" description="Kluczowe publikacje z Gemini, OpenAlex i Semantic Scholar." />
                  
                  {academicWorks.length > 0 && (
                    <div className="mb-8 space-y-4">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Wyniki z OpenAlex & Semantic Scholar</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {academicWorks.map((work, i) => (
                          <div key={i} className="scientific-glass p-4 flex flex-col justify-between hover:border-scientific-accent transition-all">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] bg-scientific-accent/10 text-scientific-accent px-2 py-0.5 rounded uppercase font-bold">{work.source}</span>
                                <span className="text-[10px] text-gray-500">{work.year}</span>
                              </div>
                              <h4 className="text-sm font-bold text-white line-clamp-2">{work.title}</h4>
                              <p className="text-xs text-gray-400 mt-1">{work.author}</p>
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                              {work.doi && <span className="text-[9px] text-gray-500 font-mono">DOI: {work.doi}</span>}
                              <a href={work.url} target="_blank" rel="noopener noreferrer" className="text-scientific-accent hover:underline text-xs flex items-center gap-1">
                                <Globe size={12} /> Link
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {biblio ? (
                    <div className="space-y-12">
                      {/* Polish Segment */}
                      {biblio.polish.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <h3 className="text-xs font-bold text-scientific-accent uppercase tracking-[0.2em]">Publikacje Polskojęzyczne</h3>
                            <div className="h-px flex-1 bg-white/10"></div>
                          </div>
                          <div className="space-y-6">
                            {biblio.polish.map((item, i) => (
                              <div key={i} className="scientific-glass p-6 space-y-4 border-l-4 border-l-scientific-accent/50">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-white font-medium leading-relaxed flex-1">{item.citation}</p>
                                    <div className="flex gap-2 shrink-0">
                                      {item.url && (
                                        <a 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 bg-scientific-accent/10 text-scientific-accent rounded-lg hover:bg-scientific-accent/20 transition-colors"
                                          title="Otwórz artykuł"
                                        >
                                          <Globe size={18} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {item.doi && (
                                    <p className="text-xs text-scientific-accent font-mono">DOI: {item.doi}</p>
                                  )}

                                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                                    <Quote className="text-scientific-accent shrink-0 mt-1" size={16} />
                                    <p className="text-sm italic text-gray-400">{item.justification}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">BibTeX</p>
                                  <pre className="bg-scientific-dark p-4 rounded-lg text-[11px] font-mono text-scientific-accent overflow-x-auto border border-scientific-border">
                                    {item.bibtex}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* English Segment */}
                      {biblio.english.length > 0 && (
                        <div className="space-y-6">
                          <div className="flex items-center gap-3">
                            <div className="h-px flex-1 bg-white/10"></div>
                            <h3 className="text-xs font-bold text-scientific-accent uppercase tracking-[0.2em]">English Publications</h3>
                            <div className="h-px flex-1 bg-white/10"></div>
                          </div>
                          <div className="space-y-6">
                            {biblio.english.map((item, i) => (
                              <div key={i} className="scientific-glass p-6 space-y-4 border-l-4 border-l-scientific-accent/50">
                                <div className="space-y-3">
                                  <div className="flex items-start justify-between gap-4">
                                    <p className="text-white font-medium leading-relaxed flex-1">{item.citation}</p>
                                    <div className="flex gap-2 shrink-0">
                                      {item.url && (
                                        <a 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="p-2 bg-scientific-accent/10 text-scientific-accent rounded-lg hover:bg-scientific-accent/20 transition-colors"
                                          title="Otwórz artykuł"
                                        >
                                          <Globe size={18} />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {item.doi && (
                                    <p className="text-xs text-scientific-accent font-mono">DOI: {item.doi}</p>
                                  )}

                                  <div className="flex items-start gap-3 bg-white/5 p-3 rounded-lg">
                                    <Quote className="text-scientific-accent shrink-0 mt-1" size={16} />
                                    <p className="text-sm italic text-gray-400">{item.justification}</p>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">BibTeX</p>
                                  <pre className="bg-scientific-dark p-4 rounded-lg text-[11px] font-mono text-scientific-accent overflow-x-auto border border-scientific-border">
                                    {item.bibtex}
                                  </pre>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState message="Wprowadź abstrakt, aby znaleźć kluczowe publikacje." />
                  )}
                </motion.div>
              )}

              {activeTab === 'review' && (
                <motion.div 
                  key="review"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <SectionHeader title="AI Recenzja & Adversarial Review" description="Głęboka analiza logiki oraz krytyczne pytania metodologiczne." />
                  
                  {review || adversarial ? (
                    <div className="space-y-6">
                      {adversarial && (
                        <div className="scientific-glass p-6 space-y-4 border-l-4 border-l-orange-500">
                          <h3 className="text-white font-semibold flex items-center gap-2">
                            <ShieldAlert className="text-orange-500" size={18} />
                            Adversarial Review (Krytyka Metodologii)
                          </h3>
                          <div className="space-y-4">
                            {adversarial.criticalQuestions.map((item, i) => (
                              <div key={i} className="space-y-2 bg-white/5 p-4 rounded-lg border border-white/5">
                                <p className="text-sm font-bold text-orange-400">Pytanie {i+1}: {item.question}</p>
                                <p className="text-sm text-gray-400 italic">Sugerowana odpowiedź: {item.suggestion}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {review && (
                        <>
                          <div className="scientific-glass p-6 space-y-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <AlertCircle className="text-red-400" size={18} />
                              Spójność Logiczna
                            </h3>
                            <ul className="space-y-2">
                              {review.logicalErrors.map((err, i) => (
                                <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                                  <span className="text-red-400 mt-1">•</span>
                                  {err}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="scientific-glass p-6 space-y-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <Sparkles className="text-scientific-accent" size={18} />
                              Wzmocnienie Dyskusji
                            </h3>
                            <p className="text-sm text-gray-400 leading-relaxed">
                              {review.discussionStrengthening}
                            </p>
                          </div>
                          <div className="scientific-glass p-6 space-y-4">
                            <h3 className="text-white font-semibold flex items-center gap-2">
                              <FileText className="text-scientific-accent" size={18} />
                              Sugestie Stylu Akademickiego
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {review.styleSuggestions.map((sug, i) => (
                                <span key={i} className="bg-scientific-accent/10 border border-scientific-accent/20 text-scientific-accent px-3 py-1 rounded-full text-xs">
                                  {sug}
                                </span>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <button 
                        onClick={handleApplyChanges}
                        disabled={loading}
                        className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 rounded-xl transition-all flex items-center justify-center gap-2 font-bold"
                      >
                        {loading ? <Loader2 className="animate-spin" /> : <RefreshCw size={18} className="text-scientific-accent" />}
                        Wdróż sugerowane zmiany w abstrakcie
                      </button>
                    </div>
                  ) : (
                    <EmptyState message="Wklej swój abstrakt/szkic, aby otrzymać recenzję AI." />
                  )}
                </motion.div>
              )}

              {activeTab === 'map' && (
                <motion.div 
                  key="map"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <SectionHeader title="Visual Research Map" description="Interaktywny graf łączący Twoje badania z kluczowymi postaciami i koncepcjami." />
                  {researchMap ? (
                    <ResearchMap data={researchMap} />
                  ) : (
                    <EmptyState message="Przetwórz abstrakt, aby wygenerować mapę powiązań." />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
