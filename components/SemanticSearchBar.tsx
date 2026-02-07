'use client';

import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { semanticSearch, backfillSearch } from '@/lib/semanticSearch';
import type { TSemanticSearchResult } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

export default function SemanticSearchBar({
	roomId,
	onSelectMessage,
}: {
	roomId: string;
	onSelectMessage?: (message: TSemanticSearchResult['message']) => void;
}) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(false);
	const [backfilling, setBackfilling] = useState(false);
	const [results, setResults] = useState<TSemanticSearchResult[]>([]);
	const { toast } = useToast();

	const handleSearch = async () => {
		const q = query.trim();
		if (!q) return;
		setLoading(true);
		setResults([]);
		try {
			const res = await semanticSearch(roomId, q);
			if (res.success && res.results) {
				setResults(res.results);
				if (res.results.length === 0 && res.message) {
					toast({ title: 'No results', description: res.message });
				}
			} else {
				toast({ title: 'Search failed', description: res.error || 'Try again.', variant: 'destructive' });
			}
		} catch (e) {
			toast({ title: 'Search failed', description: 'Check connection and try again.', variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	};

	const handleBackfill = async () => {
		setBackfilling(true);
		try {
			const res = await backfillSearch(roomId);
			if (res.success) {
				toast({ title: 'Backfill done', description: `Indexed ${res.updatedCount ?? 0} messages in this room.` });
			} else {
				toast({ title: 'Backfill failed', description: res.error, variant: 'destructive' });
			}
		} catch (e) {
			toast({ title: 'Backfill failed', description: 'Check connection.', variant: 'destructive' });
		} finally {
			setBackfilling(false);
		}
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button variant="ghost" size="icon" aria-label="Semantic search in chat">
					<Search className="h-5 w-5" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-96 p-3" align="end">
				<div className="space-y-3">
					<p className="text-sm font-medium text-muted-foreground">Search by meaning (semantic search)</p>
					<div className="flex gap-2">
						<Input
							placeholder="e.g. dinner plans, meeting time"
							value={query}
							onChange={(e) => setQuery(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
							className="flex-1"
						/>
						<Button size="sm" onClick={handleSearch} disabled={loading || !query.trim()}>
							{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
						</Button>
					</div>
					{results.length > 0 && (
						<div className="max-h-64 overflow-y-auto space-y-2 border-t pt-2">
							{results.map((r, i) => (
								<button
									key={`${r.message.id}-${i}`}
									type="button"
									className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
									onClick={() => {
										onSelectMessage?.(r.message);
										setOpen(false);
									}}
								>
									<div className="flex justify-between items-start gap-2">
										<span className="text-xs text-muted-foreground">{r.message.userName}</span>
										<span className="text-xs text-muted-foreground shrink-0">{(r.score * 100).toFixed(0)}%</span>
									</div>
									<p className="text-sm line-clamp-2">{r.message.chatInfo}</p>
								</button>
							))}
						</div>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
