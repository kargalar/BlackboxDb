'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import Link from 'next/link';
import { GET_CITATION_NETWORK } from '@/services/graphql/content';
import {
  Network,
  List,
  Search,
  SlidersHorizontal,
  Info,
  ChevronRight,
  HelpCircle,
  Film,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Interfaces
interface CitationNode {
  id: string;
  title: string;
  posterUrl?: string | null;
  contentTypeId: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

interface CitationLink {
  id: number;
  source: string;
  target: string;
  note?: string | null;
  imageUrl?: string | null;
}

interface CitationGraphState {
  source: any[];
  nodes: CitationNode[];
  links: CitationLink[];
}

function createCitationGraph(citationData: any[]): CitationGraphState {
  const nodeMap = new Map<
    string,
    { title: string; posterUrl?: string | null; contentTypeId: number }
  >();
  const links: CitationLink[] = [];

  citationData.forEach((citation: any) => {
    if (citation.citingContent) {
      nodeMap.set(citation.citingContent.id, {
        title: citation.citingContent.title,
        posterUrl: citation.citingContent.posterUrl,
        contentTypeId: citation.citingContent.contentTypeId,
      });
    }
    if (citation.citedContent) {
      nodeMap.set(citation.citedContent.id, {
        title: citation.citedContent.title,
        posterUrl: citation.citedContent.posterUrl,
        contentTypeId: citation.citedContent.contentTypeId,
      });
    }

    links.push({
      id: citation.id,
      source: citation.citingContentId,
      target: citation.citedContentId,
      note: citation.note,
      imageUrl: citation.imageUrl,
    });
  });

  const width = 800;
  const height = 600;
  const nodes: CitationNode[] = Array.from(nodeMap.entries()).map(([id, info], index) => {
    const angle = (index / nodeMap.size) * 2 * Math.PI;
    const radius = 100 + Math.random() * 150;
    return {
      id,
      title: info.title,
      posterUrl: info.posterUrl,
      contentTypeId: info.contentTypeId,
      x: width / 2 + Math.cos(angle) * radius,
      y: height / 2 + Math.sin(angle) * radius,
      vx: 0,
      vy: 0,
      radius: 40,
    };
  });

  return { source: citationData, nodes, links };
}

const contentTypeSlugs: Record<number, string> = {
  1: 'movie',
  2: 'tv',
  3: 'game',
  4: 'book',
  5: 'music',
};

const citationNoteAliases: Record<string, string[]> = {
  'Jules and Jim': ['Jules et Jim'],
  'The Visitors': ['Les Visiteurs'],
  'Porn in the Hood': ['Les Kaïra'],
};

function getContentHref(content: { id?: string; contentTypeId?: number }) {
  if (!content.id) return '#';
  const typeSlug = contentTypeSlugs[Number(content.contentTypeId)] || 'movie';
  return `/content/${typeSlug}/${content.id}`;
}

function CitationContentLink({
  content,
  className = '',
}: {
  content?: { id?: string; title?: string; contentTypeId?: number } | null;
  className?: string;
}) {
  if (!content?.id || !content.title) return null;

  return (
    <Link
      href={getContentHref(content) as any}
      onClick={(event) => event.stopPropagation()}
      className={`text-violet-300 hover:text-white hover:underline underline-offset-2 transition-colors ${className}`}
    >
      {content.title}
    </Link>
  );
}

function renderCitationNote(
  note: string | null | undefined,
  contents: Array<{ id?: string; title?: string; contentTypeId?: number } | null | undefined>
) {
  if (!note) return 'No description provided.';

  const candidates = contents
    .filter((content): content is { id: string; title: string; contentTypeId?: number } =>
      Boolean(content?.id && content.title)
    )
    .flatMap((content) => [
      { label: content.title, content },
      ...(citationNoteAliases[content.title] || []).map((label) => ({ label, content })),
    ])
    .sort((first, second) => second.label.length - first.label.length);

  if (candidates.length === 0) return note;

  const escapedLabels = candidates.map(({ label }) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const matcher = new RegExp(`(${escapedLabels.join('|')})`, 'gi');

  return note.split(matcher).map((part, index) => {
    const match = candidates.find(({ label }) => label.toLowerCase() === part.toLowerCase());
    if (!match) return <span key={`note-text-${index}`}>{part}</span>;

    return (
      <CitationContentLink
        key={`note-link-${index}`}
        content={match.content}
        className="font-semibold"
      />
    );
  });
}

export default function CitationNetworkPage() {
  const [viewMode, setViewMode] = useState<'network' | 'list'>('network');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContentType, setSelectedContentType] = useState<string>('all');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // SVG Viewport Pan/Zoom State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const isDraggingCanvas = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Node Dragging State
  const draggedNodeId = useRef<string | null>(null);
  const nodePointerStart = useRef<{ x: number; y: number } | null>(null);
  const didDragNode = useRef(false);

  const svgRef = useRef<SVGSVGElement>(null);

  // GraphQL Query
  const { data, loading, error, refetch } = useQuery(GET_CITATION_NETWORK, {
    fetchPolicy: 'cache-and-network',
  });

  const citationData = useMemo(() => (data as any)?.citationNetwork || [], [data]);

  // Graph Physics State
  const [graph, setGraph] = useState(() => createCitationGraph(citationData));
  if (graph.source !== citationData) {
    setGraph(createCitationGraph(citationData));
  }
  const { nodes, links } = graph;

  // Force-Directed Graph Simulation Loop
  useEffect(() => {
    if (citationData.length === 0 || viewMode !== 'network' || nodes.length === 0) return;

    let animationFrameId: number;
    const width = 800;
    const height = 600;

    // Simulation parameters
    const k = 0.05; // Spring constant (link strength)
    const repStrength = 1800; // Repulsion strength
    const centerForce = 0.02; // Centering force
    const friction = 0.85; // Friction/velocity damping

    const tick = () => {
      setGraph((currentGraph) => {
        const currentNodes = currentGraph.nodes;
        // Copy positions
        const updatedNodes = currentNodes.map((n) => ({ ...n }));
        const nodeMap = new Map(updatedNodes.map((n) => [n.id, n]));

        // 1. Repulsion force (Coulomb repulsion between nodes)
        for (let i = 0; i < updatedNodes.length; i++) {
          const n1 = updatedNodes[i];
          for (let j = i + 1; j < updatedNodes.length; j++) {
            const n2 = updatedNodes[j];
            const dx = n1.x - n2.x;
            const dy = n1.y - n2.y;
            const distSq = dx * dx + dy * dy + 1; // Prevent division by zero
            const dist = Math.sqrt(distSq);

            if (dist < 300) {
              const force = repStrength / distSq;
              const fx = (dx / dist) * force;
              const fy = (dy / dist) * force;

              n1.vx += fx;
              n1.vy += fy;
              n2.vx -= fx;
              n2.vy -= fy;
            }
          }
        }

        // 2. Attraction force (Hooke's law between links)
        links.forEach((link) => {
          const n1 = nodeMap.get(link.source);
          const n2 = nodeMap.get(link.target);
          if (n1 && n2) {
            const dx = n2.x - n1.x;
            const dy = n2.y - n1.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;

            // Ideal link length
            const desiredDist = 180;
            const force = k * (dist - desiredDist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            n1.vx += fx;
            n1.vy += fy;
            n2.vx -= fx;
            n2.vy -= fy;
          }
        });

        // 3. Centering force and velocity update
        updatedNodes.forEach((n) => {
          if (n.id === draggedNodeId.current) {
            // A dragged node does not accelerate and stays under the mouse
            return;
          }

          const dx = width / 2 - n.x;
          const dy = height / 2 - n.y;

          n.vx += dx * centerForce;
          n.vy += dy * centerForce;

          // Apply friction and update position
          n.vx *= friction;
          n.vy *= friction;
          n.x += n.vx;
          n.y += n.vy;

          // Keep nodes within the viewport
          n.x = Math.max(80, Math.min(width - 80, n.x));
          n.y = Math.max(80, Math.min(height - 80, n.y));
        });

        return { ...currentGraph, nodes: updatedNodes };
      });

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [citationData.length, links, viewMode, nodes.length]);

  // Handle Dragging Canvas (Pan)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (draggedNodeId.current) return;
    isDraggingCanvas.current = true;
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingCanvas.current) {
      setPan({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    } else if (draggedNodeId.current) {
      if (nodePointerStart.current) {
        const movedX = Math.abs(e.clientX - nodePointerStart.current.x);
        const movedY = Math.abs(e.clientY - nodePointerStart.current.y);
        didDragNode.current = didDragNode.current || movedX > 4 || movedY > 4;
      }

      // Update the dragged node position
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      // Convert mouse coordinates to SVG viewport coordinates
      const mouseX = (e.clientX - rect.left - pan.x) / zoom;
      const mouseY = (e.clientY - rect.top - pan.y) / zoom;

      setGraph((currentGraph) => ({
        ...currentGraph,
        nodes: currentGraph.nodes.map((node) =>
          node.id === draggedNodeId.current ? { ...node, x: mouseX, y: mouseY, vx: 0, vy: 0 } : node
        ),
      }));
    }
  };

  const handleMouseUp = () => {
    isDraggingCanvas.current = false;
    const nodeId = draggedNodeId.current;
    if (nodeId && !didDragNode.current) {
      setSelectedNodeId((currentId) => (currentId === nodeId ? null : nodeId));
    }
    draggedNodeId.current = null;
    nodePointerStart.current = null;
    didDragNode.current = false;
  };

  // Zooming: attach a non-passive native listener so the page does not scroll while zooming.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || viewMode !== 'network') return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const zoomFactor = 1.1;
      setZoom((currentZoom) =>
        event.deltaY < 0
          ? Math.min(2.5, currentZoom * zoomFactor)
          : Math.max(0.4, currentZoom / zoomFactor)
      );
    };

    svg.addEventListener('wheel', handleWheel, { passive: false });
    return () => svg.removeEventListener('wheel', handleWheel);
  }, [viewMode]);

  // Node Drag
  const startDragNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    draggedNodeId.current = id;
    nodePointerStart.current = { x: e.clientX, y: e.clientY };
    didDragNode.current = false;
  };

  // Reset Pan/Zoom
  const resetView = () => {
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setSelectedNodeId(null);
  };

  // Filtering and Searching
  const filteredCitations = useMemo(() => {
    return citationData.filter((cit: any) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        cit.citingContent?.title.toLowerCase().includes(searchLower) ||
        cit.citedContent?.title.toLowerCase().includes(searchLower) ||
        cit.note?.toLowerCase().includes(searchLower);

      if (selectedContentType === 'all') return matchesSearch;
      if (selectedContentType === 'movie') {
        return (
          matchesSearch &&
          (cit.citingContent?.contentTypeId === 1 || cit.citedContent?.contentTypeId === 1)
        );
      }
      if (selectedContentType === 'tv') {
        return (
          matchesSearch &&
          (cit.citingContent?.contentTypeId === 2 || cit.citedContent?.contentTypeId === 2)
        );
      }
      if (selectedContentType === 'game') {
        return (
          matchesSearch &&
          (cit.citingContent?.contentTypeId === 3 || cit.citedContent?.contentTypeId === 3)
        );
      }
      return matchesSearch;
    });
  }, [citationData, searchTerm, selectedContentType]);

  // A node selection turns the graph into its direct neighbourhood.
  const visibleNodeIds = useMemo(() => {
    if (!selectedNodeId) return null;

    const relatedIds = new Set<string>([selectedNodeId]);
    citationData.forEach((citation: any) => {
      if (citation.citingContentId === selectedNodeId) relatedIds.add(citation.citedContentId);
      if (citation.citedContentId === selectedNodeId) relatedIds.add(citation.citingContentId);
    });
    return relatedIds;
  }, [citationData, selectedNodeId]);

  const visibleNodes = useMemo(() => {
    if (citationData.length === 0) return [];
    return visibleNodeIds ? nodes.filter((node) => visibleNodeIds.has(node.id)) : nodes;
  }, [citationData.length, nodes, visibleNodeIds]);

  const visibleLinks = useMemo(() => {
    if (citationData.length === 0) return [];
    return visibleNodeIds
      ? links.filter((link) => visibleNodeIds.has(link.source) && visibleNodeIds.has(link.target))
      : links;
  }, [citationData.length, links, visibleNodeIds]);

  // Selected Node Details (For side panel in graph mode)
  const selectedNodeDetails = useMemo(() => {
    if (!selectedNodeId || citationData.length === 0) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;

    const referencesMade = citationData.filter((c: any) => c.citingContentId === selectedNodeId);
    const referencesReceived = citationData.filter((c: any) => c.citedContentId === selectedNodeId);

    return {
      node,
      referencesMade,
      referencesReceived,
    };
  }, [selectedNodeId, nodes, citationData]);

  return (
    <div className="min-h-screen bg-surface-page text-gray-100 font-sans pb-16">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.06),transparent_45%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(244,63,94,0.04),transparent_40%)] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-gray-800/80 bg-black/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 to-rose-500 p-2.5 shadow-lg shadow-violet-500/20 flex items-center justify-center">
              <Network className="w-full h-full text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-100 to-gray-400">
                Film Citation Network
              </h1>
              <p className="text-[11px] text-gray-500 font-medium">
                Explore hidden links and references between productions
              </p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex bg-gray-900/60 p-1.5 rounded-2xl border border-gray-800/60 shadow-inner">
            <button
              onClick={() => setViewMode('network')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                viewMode === 'network'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              Network View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 ${
                viewMode === 'list'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              List View
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 flex flex-col lg:flex-row gap-6 relative">
        {/* Left Side: Controls & Filters */}
        <section className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">
          {/* Search and Filters */}
          <div className="bg-gray-900/30 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-violet-500" />
              Filters & Search
            </h3>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search content or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-black/40 border border-gray-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs focus:outline-none focus:border-violet-500 transition-colors placeholder-gray-500 text-gray-200"
              />
            </div>

            {/* Content Type Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-semibold text-gray-500">Content Type</label>
              <div className="grid grid-cols-4 gap-1 bg-black/35 p-1 rounded-xl border border-gray-800/80">
                {['all', 'movie', 'tv', 'game'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedContentType(type)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      selectedContentType === type
                        ? 'bg-gray-800 text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {type === 'all'
                      ? 'All'
                      : type === 'movie'
                        ? 'Film'
                        : type === 'tv'
                          ? 'TV'
                          : 'Game'}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                refetch();
                toast.success('Veriler yenilendi.');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 border border-gray-800 rounded-xl text-xs font-semibold hover:bg-gray-800/40 text-gray-400 hover:text-gray-200 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Data
            </button>
          </div>

          {/* Network Stats */}
          <div className="bg-gray-900/30 backdrop-blur-md border border-gray-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-violet-500" />
              Statistics
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 border border-gray-850 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] text-gray-500 font-semibold">Total Citations</span>
                <span className="text-2xl font-black text-white mt-1">{citationData.length}</span>
              </div>
              <div className="bg-black/30 border border-gray-850 p-3 rounded-xl flex flex-col">
                <span className="text-[10px] text-gray-500 font-semibold">Matching</span>
                <span className="text-2xl font-black text-violet-400 mt-1">
                  {filteredCitations.length}
                </span>
              </div>
            </div>

            {viewMode === 'network' && (
              <div className="text-[11px] text-gray-500 border-t border-gray-800/60 pt-3 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span>Drag nodes with the mouse to position them.</span>
                </div>
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span>Use the mouse wheel to zoom the map.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  <span>
                    Click a node to show only its direct connections; click again to restore the
                    full network.
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Network Graph or List Flow */}
        <section className="flex-grow min-h-[600px] flex flex-col lg:flex-row gap-6">
          {loading ? (
            <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
              <span className="text-sm text-gray-500">Loading citation network...</span>
            </div>
          ) : error ? (
            <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center p-6 bg-red-950/20 border border-red-900/50 rounded-2xl">
              <span className="text-sm text-red-400 font-medium mb-2">
                An error occurred while loading the data.
              </span>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-red-650 hover:bg-red-750 rounded-xl text-xs font-semibold text-white transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : citationData.length === 0 ? (
            <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center text-center p-6 bg-gray-900/10 border border-gray-850 rounded-2xl">
              <Info className="w-8 h-8 text-gray-600 mb-2" />
              <span className="text-sm text-gray-400 font-semibold mb-1">
                No citation records yet.
              </span>
              <span className="text-xs text-gray-500 max-w-sm">
                You can create citation relationships between productions from the content editor.
              </span>
            </div>
          ) : viewMode === 'network' ? (
            // Network Graph View
            <div className="flex-grow flex flex-col lg:flex-row gap-6 w-full">
              {/* SVG Canvas Box */}
              <div className="relative flex-grow h-[600px] rounded-2xl bg-black/60 border border-gray-850 overflow-hidden shadow-2xl">
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox="0 0 800 600"
                  className="cursor-grab active:cursor-grabbing w-full h-full select-none"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {/* Arrow markers for directed edges */}
                  <defs>
                    <marker
                      id="arrow"
                      viewBox="0 0 10 10"
                      refX="48" // Keep the arrow clear of the 40px node radius
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#4c1d95" />
                    </marker>
                    <marker
                      id="arrow-hover"
                      viewBox="0 0 10 10"
                      refX="48"
                      refY="5"
                      markerWidth="7"
                      markerHeight="7"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
                    </marker>
                  </defs>

                  <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                    {/* 1. Links (Lines) */}
                    {visibleLinks.map((link) => {
                      const n1 = nodes.find((n) => n.id === link.source);
                      const n2 = nodes.find((n) => n.id === link.target);
                      if (!n1 || !n2) return null;

                      const isSelected =
                        selectedNodeId === link.source || selectedNodeId === link.target;

                      return (
                        <g key={link.id}>
                          {/* Invisible wide line for easier hovering/clicking */}
                          <line
                            x1={n1.x}
                            y1={n1.y}
                            x2={n2.x}
                            y2={n2.y}
                            stroke="transparent"
                            strokeWidth="15"
                            className="cursor-pointer"
                          />
                          <line
                            x1={n1.x}
                            y1={n1.y}
                            x2={n2.x}
                            y2={n2.y}
                            stroke={isSelected ? '#c084fc' : '#3b0764'}
                            strokeWidth={isSelected ? 2.5 : 1.5}
                            strokeDasharray={isSelected ? '0' : '0'}
                            markerEnd={`url(#${isSelected ? 'arrow-hover' : 'arrow'})`}
                            className="transition-all duration-300"
                          />
                        </g>
                      );
                    })}

                    {/* 2. Nodes (Circles with Poster pattern or fallback) */}
                    {visibleNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id;
                      const hasDetails = citationData.some(
                        (c: any) => c.citingContentId === node.id || c.citedContentId === node.id
                      );

                      if (!hasDetails) return null; // Do not draw nodes without details

                      return (
                        <g
                          key={node.id}
                          transform={`translate(${node.x}, ${node.y})`}
                          onMouseDown={(e) => startDragNode(node.id, e)}
                          className="cursor-pointer group"
                        >
                          {/* Glow background on hover/selected */}
                          <circle
                            r={node.radius + 6}
                            fill="transparent"
                            stroke={isSelected ? '#8b5cf6' : 'transparent'}
                            strokeWidth="2.5"
                            className="transition-all duration-300 drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                          />

                          {/* Main node circle */}
                          <circle
                            r={node.radius}
                            fill="#161b22"
                            stroke={isSelected ? '#a78bfa' : '#30363d'}
                            strokeWidth={isSelected ? 3 : 2}
                            className="group-hover:stroke-gray-400 transition-all duration-300"
                          />

                          {/* Render poster image if present inside clip path */}
                          {node.posterUrl ? (
                            <g>
                              <defs>
                                <clipPath id={`clip-${node.id}`}>
                                  <circle r={node.radius - 2} />
                                </clipPath>
                              </defs>
                              <image
                                href={node.posterUrl}
                                x={-node.radius}
                                y={-node.radius}
                                width={node.radius * 2}
                                height={node.radius * 2}
                                preserveAspectRatio="xMidYMid slice"
                                clipPath={`url(#clip-${node.id})`}
                              />
                            </g>
                          ) : (
                            // Fallback text
                            <text
                              textAnchor="middle"
                              dy=".3em"
                              fill="#8b949e"
                              fontSize="10"
                              fontWeight="bold"
                              className="pointer-events-none select-none"
                            >
                              {node.title.slice(0, 10)}...
                            </text>
                          )}

                          {/* Hover Tooltip - Title */}
                          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                            <rect
                              x={-80}
                              y={node.radius + 8}
                              width={160}
                              height={28}
                              rx={6}
                              fill="#0d1117"
                              stroke="#30363d"
                              strokeWidth={1}
                            />
                            <text
                              x={0}
                              y={node.radius + 26}
                              textAnchor="middle"
                              fill="#f0f6fc"
                              fontSize="9.5"
                              fontWeight="bold"
                            >
                              {node.title.length > 20
                                ? `${node.title.slice(0, 18)}...`
                                : node.title}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Reset View Button */}
                <button
                  onClick={resetView}
                  className="absolute bottom-4 right-4 bg-gray-900/80 border border-gray-800 text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all shadow-md active:scale-95"
                >
                  Reset View
                </button>
              </div>

              {/* Sidebar: Details Panel */}
              <div className="w-full lg:w-96 flex-shrink-0 bg-gray-900/20 border border-gray-800/80 rounded-2xl p-5 shadow-2xl h-[600px] overflow-y-auto backdrop-blur-md flex flex-col gap-4">
                {selectedNodeDetails ? (
                  <div className="flex flex-col gap-5">
                    {/* Node Header */}
                    <div className="flex gap-4 items-start pb-4 border-b border-gray-800">
                      <div className="w-16 h-24 rounded-lg bg-gray-800 overflow-hidden flex-shrink-0 border border-gray-700">
                        {selectedNodeDetails.node.posterUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={selectedNodeDetails.node.posterUrl}
                            alt={selectedNodeDetails.node.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                            No Poster
                          </div>
                        )}
                      </div>
                      <div className="flex-grow">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold uppercase bg-violet-900/40 text-violet-300 border border-violet-800/50 mb-1">
                          {selectedNodeDetails.node.contentTypeId === 1
                            ? 'Film'
                            : selectedNodeDetails.node.contentTypeId === 2
                              ? 'TV'
                              : 'Game'}
                        </span>
                        <h2 className="text-base font-black text-white leading-tight">
                          <CitationContentLink
                            content={selectedNodeDetails.node}
                            className="text-white"
                          />
                        </h2>
                      </div>
                    </div>

                    {/* Citations Received */}
                    {selectedNodeDetails.referencesReceived.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ChevronRight className="w-3.5 h-3.5 text-rose-500" />
                          Referencing This Title ({selectedNodeDetails.referencesReceived.length})
                        </h4>
                        <div className="flex flex-col gap-3">
                          {selectedNodeDetails.referencesReceived.map((ref: any) => (
                            <div
                              key={ref.id}
                              className="bg-black/40 border border-gray-850 p-4 rounded-xl flex flex-col gap-3"
                            >
                              <div className="flex gap-3 items-center">
                                <div className="w-7 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                  {ref.citingContent?.posterUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={ref.citingContent.posterUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <CitationContentLink
                                  content={ref.citingContent}
                                  className="text-xs font-bold text-gray-200"
                                />
                              </div>
                              {ref.note && (
                                <p className="text-xs text-gray-400 leading-relaxed italic bg-white/5 p-2 rounded-lg border border-white/5">
                                  &quot;
                                  {renderCitationNote(ref.note, [
                                    ref.citingContent,
                                    ref.citedContent,
                                  ])}
                                  &quot;
                                </p>
                              )}
                              {ref.imageUrl && (
                                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-800">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ref.imageUrl}
                                    alt="Citation image"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Citations Made */}
                    {selectedNodeDetails.referencesMade.length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                          <ChevronRight className="w-3.5 h-3.5 text-violet-500" />
                          Titles Referenced By This Work (
                          {selectedNodeDetails.referencesMade.length})
                        </h4>
                        <div className="flex flex-col gap-3">
                          {selectedNodeDetails.referencesMade.map((ref: any) => (
                            <div
                              key={ref.id}
                              className="bg-black/40 border border-gray-850 p-4 rounded-xl flex flex-col gap-3"
                            >
                              <div className="flex gap-3 items-center">
                                <div className="w-7 h-10 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                                  {ref.citedContent?.posterUrl ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={ref.citedContent.posterUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : null}
                                </div>
                                <CitationContentLink
                                  content={ref.citedContent}
                                  className="text-xs font-bold text-gray-200"
                                />
                              </div>
                              {ref.note && (
                                <p className="text-xs text-gray-400 leading-relaxed italic bg-white/5 p-2 rounded-lg border border-white/5">
                                  &quot;
                                  {renderCitationNote(ref.note, [
                                    ref.citingContent,
                                    ref.citedContent,
                                  ])}
                                  &quot;
                                </p>
                              )}
                              {ref.imageUrl && (
                                <div className="relative w-full h-24 rounded-lg overflow-hidden border border-gray-800">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ref.imageUrl}
                                    alt="Citation image"
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                    <Network className="w-10 h-10 stroke-1 mb-2 text-gray-600 animate-pulse" />
                    <span className="text-xs font-semibold">
                      Select a production node on the network to view its details.
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // List View Flow
            <div className="flex-grow flex flex-col gap-4 w-full">
              {filteredCitations.map((cit: any) => (
                <article
                  key={cit.id}
                  className="bg-gray-900/20 border border-gray-800/80 rounded-2xl p-5 shadow-lg flex flex-col gap-4 hover:border-gray-700 transition-all duration-300"
                >
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-between pb-3 border-b border-gray-850">
                    {/* Citing Work */}
                    <div className="flex items-center gap-3 w-full sm:w-[45%]">
                      <div className="w-10 h-14 rounded-lg bg-gray-800 overflow-hidden border border-gray-700 flex-shrink-0">
                        {cit.citingContent?.posterUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cit.citingContent.posterUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-violet-950 text-violet-300 border border-violet-800/50 mb-0.5 uppercase">
                          Referencing Work
                        </span>
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          <CitationContentLink content={cit.citingContent} className="text-white" />
                        </h4>
                        <span className="text-[10px] text-gray-500">
                          {cit.citingContent?.releaseDate
                            ? new Date(cit.citingContent.releaseDate).getFullYear()
                            : ''}
                        </span>
                      </div>
                    </div>

                    {/* Arrow / Connection */}
                    <div className="flex flex-col items-center justify-center text-gray-600">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 text-violet-400">
                        References
                      </span>
                      <ChevronRight className="w-5 h-5 hidden sm:block text-violet-500" />
                    </div>

                    {/* Cited Work */}
                    <div className="flex items-center gap-3 w-full sm:w-[45%] justify-start sm:justify-end sm:text-right">
                      <div className="order-2 sm:order-1">
                        <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-rose-950 text-rose-300 border border-rose-800/50 mb-0.5 uppercase">
                          Referenced Work
                        </span>
                        <h4 className="text-sm font-bold text-white line-clamp-1">
                          <CitationContentLink content={cit.citedContent} className="text-white" />
                        </h4>
                        <span className="text-[10px] text-gray-500">
                          {cit.citedContent?.releaseDate
                            ? new Date(cit.citedContent.releaseDate).getFullYear()
                            : ''}
                        </span>
                      </div>
                      <div className="w-10 h-14 rounded-lg bg-gray-800 overflow-hidden border border-gray-700 flex-shrink-0 order-1 sm:order-2">
                        {cit.citedContent?.posterUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={cit.citedContent.posterUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Citation Info */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                    <div
                      className={
                        cit.imageUrl
                          ? 'md:col-span-8 flex flex-col gap-2'
                          : 'md:col-span-12 flex flex-col gap-2'
                      }
                    >
                      <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Film className="w-3.5 h-3.5 text-violet-400" />
                        Citation Details / Note
                      </h5>
                      <p className="text-sm text-gray-300 leading-relaxed italic bg-black/35 p-3.5 rounded-xl border border-gray-850">
                        &quot;{renderCitationNote(cit.note, [cit.citingContent, cit.citedContent])}
                        &quot;
                      </p>
                    </div>
                    {cit.imageUrl && (
                      <div className="md:col-span-4 flex flex-col gap-2">
                        <h5 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                          Scene Image
                        </h5>
                        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-850 bg-black/40 group cursor-zoom-in">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={cit.imageUrl}
                            alt="Citation scene"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
