import { customFetch } from './utils';
import type { TSemanticSearchResponse, TBackfillSearchResponse } from './types';

const API = 'api';

export async function semanticSearch(roomId: string, query: string): Promise<TSemanticSearchResponse> {
	const params = new URLSearchParams({ roomId, query });
	const path = `${API}/search?${params.toString()}`;
	return customFetch({ pathName: path, method: 'GET' }) as Promise<TSemanticSearchResponse>;
}

export async function backfillSearch(roomId?: string): Promise<TBackfillSearchResponse> {
	const path = `${API}/search/backfill`;
	return customFetch({
		pathName: path,
		method: 'POST',
		body: roomId != null ? { roomId } : {}
	}) as Promise<TBackfillSearchResponse>;
}
