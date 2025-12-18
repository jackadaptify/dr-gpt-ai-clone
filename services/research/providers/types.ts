import { ResearchSource } from '../orchestratorService';

export interface ResearchProvider {
    name: string;
    sourceType: ResearchSource['source'];
    search(query: string, limit?: number): Promise<ResearchSource[]>;
}
