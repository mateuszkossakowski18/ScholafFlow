/**
 * Integration with OpenAlex and Semantic Scholar APIs
 */

export interface AcademicWork {
  id: string;
  title: string;
  author: string;
  year: number;
  url: string;
  doi?: string;
  source: 'OpenAlex' | 'SemanticScholar' | 'Scopus' | 'WebOfScience' | 'GoogleScholar' | 'BazEkon' | 'BazTech' | 'CEJSH';
}

export const academicApiService = {
  async searchOpenAlex(query: string): Promise<AcademicWork[]> {
    try {
      const response = await fetch(`/api/academic/search?source=openalex&query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('OpenAlex proxy error');
      const data = await response.json();
      
      return data.results.map((item: any) => ({
        id: item.id,
        title: item.display_name,
        author: item.authorships?.[0]?.author?.display_name || 'Unknown',
        year: item.publication_year,
        url: item.doi || item.ids?.mag || '#',
        doi: item.doi?.replace('https://doi.org/', ''),
        source: 'OpenAlex'
      }));
    } catch (error) {
      console.error('OpenAlex search failed:', error);
      return [];
    }
  },

  async searchSemanticScholar(query: string): Promise<AcademicWork[]> {
    try {
      const response = await fetch(`/api/academic/search?source=semanticscholar&query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Semantic Scholar proxy error');
      const data = await response.json();
      
      return (data.data || []).map((item: any) => ({
        id: item.paperId,
        title: item.title,
        author: item.authors?.[0]?.name || 'Unknown',
        year: item.year,
        url: item.url,
        doi: item.externalIds?.DOI,
        source: 'SemanticScholar'
      }));
    } catch (error) {
      console.error('Semantic Scholar search failed:', error);
      return [];
    }
  },

  async searchScopus(query: string): Promise<AcademicWork[]> {
    try {
      const response = await fetch(`/api/academic/search?source=scopus&query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Scopus proxy error');
      const data = await response.json();
      
      if (data.results === undefined && data['search-results'] === undefined) {
        // Handle proxy returning { message, results: [] }
        return [];
      }

      return (data['search-results']?.entry || []).map((item: any) => ({
        id: item['dc:identifier'],
        title: item['dc:title'],
        author: item['dc:creator'] || 'Unknown',
        year: parseInt(item['prism:coverDate']?.split('-')[0]) || 0,
        url: item.link?.find((l: any) => l['@ref'] === 'scopus')?.['@href'] || '#',
        doi: item['prism:doi'],
        source: 'Scopus'
      }));
    } catch (error) {
      console.error('Scopus search failed:', error);
      return [];
    }
  },

  async searchWebOfScience(query: string): Promise<AcademicWork[]> {
    try {
      const response = await fetch(`/api/academic/search?source=wos&query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Web of Science proxy error');
      const data = await response.json();
      
      if (data.results === undefined && data.Data === undefined) {
        // Handle proxy returning { message, results: [] }
        return [];
      }

      return (data.Data?.Records?.records?.REC || []).map((item: any) => ({
        id: item.UID,
        title: item.static_data?.summary?.titles?.title?.find((t: any) => t.type === 'item')?.content || 'Unknown',
        author: item.static_data?.summary?.names?.name?.[0]?.display_name || 'Unknown',
        year: parseInt(item.static_data?.summary?.pub_info?.pubyear) || 0,
        url: `https://www.webofscience.com/wos/woscc/full-record/${item.UID}`,
        doi: item.dynamic_data?.cluster_related?.identifiers?.identifier?.find((i: any) => i.type === 'doi')?.value,
        source: 'WebOfScience'
      }));
    } catch (error) {
      console.error('Web of Science search failed:', error);
      return [];
    }
  },

  async searchSpecialized(query: string, source: 'googlescholar' | 'bazekon' | 'baztech' | 'cejsh'): Promise<AcademicWork[]> {
    // For these sources, we'll use Gemini's search grounding to find real results
    // This is handled in the frontend by calling a specialized Gemini prompt
    // For now, we'll just return an empty array and let the App component handle it via geminiService
    return [];
  }
};
