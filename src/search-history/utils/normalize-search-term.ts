import { MAX_TERM_LENGTH } from '../constants/search-history.constants';

export const normalizeSearchTerm = (term: string) => 
  term.trim().replace(/\s+/g, ' ').toLowerCase().slice(0, MAX_TERM_LENGTH);
