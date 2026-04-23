function FlowCanvas({ nodes, onNodesChange, selectedId, onSelect, onDragEnd }: {
  nodes: FlowNode[];
  onNodesChange: (nodes: FlowNode[]) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onDragEnd?: (nodes: FlowNode[]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [dragging, setDragging] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panX: number; panY: number } | null>(null);
  const [connectDrag, setConnectDrag] = useState<{ sourceId: string; x: number; y: number } | null>(null);
  const [hoverTargetId, setHoverTargetId] = useState<string | null>(null);
  const lastPinchDist = useRef<number | null>(null);
  const lastPinchZoom = useRef<number>(1);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const NODE_W = 220;
  const NODE_H = 110;
  const MIN_ZOOM = 0.2;
  const MAX_ZOOM = 2;
  const PADDING = 60;

  // ── Auto-fit: centraliza e ajusta zoom para todos os nós ficarem visíveis ──────
  const fitView = useCallback(() => {
    if (!containerRef.current || nodes.length === 0) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const minX = Math.min(...nodes.map(n => n.x));
    const minY = Math.min(...nodes.map(n => n.y));
    const maxX = Math.max(...nodes.map(n => n.x + NODE_W));
    const maxY = Math.max(...nodes.map(n => n.y + NODE_H));
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const scaleX = (cw - PADDING * 2) / contentW;
    const scaleY = (ch - PADDING * 2) / contentH;
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_ZOOM), MAX_ZOOM);
    const newPanX = (cw - contentW * newZoom) / 2 - minX * newZoom;
    const newPanY = (ch - contentH * newZoom) / 2 - minY * newZoom;
    setZoom(newZoom);
    setPan({ x: newPanX, y: newPanY });
  }, [nodes]);

  // Auto-fit ao montar ou quando nodes mudam de comprimento (nova automação aberta)
  const prevNodeCount = useRef(-1);
  useEffect(() => {
    if (nodes.length > 0 && prevNodeCount.current !== nodes.length) {
      // Pequeno delay para garantir que o container tem dimensões
      const t = setTimeout(fitView, 80);
      prevNodeCount.current = nodes.length;
      return () => clearTimeout(t);
    }
  }, [nodes.length, fitView]);

  // ── Converter coordenadas de tela → canvas ────────────────────────────────────
  const screenToCanvas = useCallback((sx: number, sy: number) => {
    if (!containerRef.current) return { x: sx, y: sy };
    const r = containerRef.current.getBoundingClientRect();
    return {
      x: (sx - r.left - pan.x) / zoom,
      y: (sy - r.top - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Zoom com roda do mouse ────────────────────────────────────────────────────
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - r.left;
    const mouseY = e.clientY - r.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => {
      const next = Math.min(Math.max(prev * delta, MIN_ZOOM), MAX_ZOOM);
      const ratio = next / prev;
      setPan(p => ({
        x: mouseX - (mouseX - p.x) * ratio,
        y: mouseY - (mouseY - p.y) * ratio,
      }));
      return next;
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Pan com botão do meio ou arrastar fundo ────────────────────────────────────
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && (e.target as HTMLElement) === containerRef.current)) {
      e.preventDefault();
      setPanning({ startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y });
    }
  };

  // ── Drag de nó ────────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    if ((e.target as HTMLElement).closest("button,select,input,textarea,[data-port]")) return;
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const canvasPos = screenToCanvas(e.clientX, e.clientY);
    setDragging({ id, ox: canvasPos.x - node.x, oy: canvasPos.y - node.y });
    onSelect(id);
    e.preventDefault();
    e.stopPropagation();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (panning) {
      setPan({
        x: panning.panX + (e.clientX - panning.startX),
        y: panning.panY + (e.clientY - panning.startY),
      });
    }
    if (dragging) {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      const cx = (e.clientX - r.left - pan.x) / zoom;
      const cy = (e.clientY - r.top - pan.y) / zoom;
      const x = Math.max(0, cx - dragging.ox);
      const y = Math.max(0, cy - dragging.oy);
      onNodesChange(nodesRef.current.map(n => n.id === dragging.id ? { ...n, x, y } : n));
    }
    if (connectDrag) {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      // Coordenadas no espaço do canvas transformado
      const cx = (e.clientX - r.left - pan.x) / zoom;
      const cy = (e.clientY - r.top - pan.y) / zoom;
      setConnectDrag(prev => prev ? { ...prev, x: cx, y: cy } : null);
    }
  }, [panning, dragging, connectDrag, pan, zoom, onNodesChange]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (panning) setPanning(null);
    if (dragging) {
      onDragEnd?.(nodesRef.current);
      setDragging(null);
    }
    if (connectDrag) {
      if (hoverTargetId && hoverTargetId !== connectDrag.sourceId) {
        const sourceNode = nodesRef.current.find(n => n.id === connectDrag.sourceId);
        if (sourceNode && !sourceNode.connections.includes(hoverTargetId)) {
          onNodesChange(nodesRef.current.map(n =>
            n.id === connectDrag.sourceId
              ? { ...n, connections: [...n.connections, hoverTargetId] }
              : n
          ));
          toast.success("Nós conectados!");
        }
      }
      setConnectDrag(null);
      setHoverTargetId(null);
    }
  }, [panning, dragging, connectDrag, hoverTargetId, onNodesChange, onDragEnd]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // ── Pinch-to-zoom (touch) ─────────────────────────────────────────────────────
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy);
      lastPinchZoom.current = zoom;
    }
  }, [zoom]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2 && lastPinchDist.current !== null) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const ratio = dist / lastPinchDist.current;
      const newZoom = Math.min(Math.max(lastPinchZoom.current * ratio, MIN_ZOOM), MAX_ZOOM);
      setZoom(newZoom);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    lastPinchDist.current = null;
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("touchstart", handleTouchStart, { passive: false });
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    el.addEventListener("touchend", handleTouchEnd);
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  // ── Porta de saída (source port) ──────────────────────────────────────────────
  const handlePortMouseDown = (e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!containerRef.current) return;
    const r = containerRef.current.getBoundingClientRect();
    const cx = (e.clientX - r.left - pan.x) / zoom;
    const cy = (e.clientY - r.top - pan.y) / zoom;
    setConnectDrag({ sourceId, x: cx, y: cy });
  };

  // ── Deletar nó ────────────────────────────────────────────────────────────────
  const handleDelete = (id: string) => {
    onNodesChange(nodes.filter(n => n.id !== id).map(n => ({ ...n, connections: n.connections.filter(c => c !== id) })));
    if (selectedId === id) onSelect(null);
  };

  // ── Deletar aresta ────────────────────────────────────────────────────────────
  const handleDeleteEdge = (sourceId: string, targetId: string) => {
    onNodesChange(nodes.map(n =>
      n.id === sourceId ? { ...n, connections: n.connections.filter(c => c !== targetId) } : n
    ));
  };

  // ── Renderizar arestas ────────────────────────────────────────────────────────
  const renderConnections = () => nodes.flatMap(node =>
    node.connections.map(tid => {
      const t = nodes.find(n => n.id === tid);
      if (!t) return null;
      const x1 = node.x + NODE_W / 2;
      const y1 = node.y + NODE_H;
      const x2 = t.x + NODE_W / 2;
      const y2 = t.y;
      const cy1 = y1 + Math.abs(y2 - y1) * 0.5;
      const cy2 = y2 - Math.abs(y2 - y1) * 0.5;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const pathId = `edge-${node.id}-${tid}`;
      return (
        <g key={pathId}>
          <path d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
            stroke="white" strokeWidth="4" fill="none" opacity="0.6" />
          <path d={`M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`}
            stroke="#6366f1" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
          <circle cx={x2} cy={y2} r="5" fill="white" stroke="#6366f1" strokeWidth="2" />
          <g style={{ cursor: "pointer" }} onClick={() => handleDeleteEdge(node.id, tid)}>
            <circle cx={midX} cy={midY} r="9" fill="white" stroke="#e5e7eb" strokeWidth="1.5" opacity="0.9" />
            <line x1={midX - 4} y1={midY - 4} x2={midX + 4} y2={midY + 4} stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
            <line x1={midX + 4} y1={midY - 4} x2={midX - 4} y2={midY + 4} stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
      );
    })
  );

  // ── Linha de preview durante drag-to-connect ──────────────────────────────────
  const renderConnectPreview = () => {
    if (!connectDrag) return null;
    const src = nodes.find(n => n.id === connectDrag.sourceId);
    if (!src) return null;
    const x1 = src.x + NODE_W / 2;
    const y1 = src.y + NODE_H;
    const x2 = connectDrag.x;
    const y2 = connectDrag.y;
    const cy = (y1 + y2) / 2;
    return (
      <g>
        <path d={`M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`}
          stroke="#6366f1" strokeWidth="2" fill="none" strokeDasharray="6 3" opacity="0.7"
          markerEnd="url(#arrowhead)" />
        <circle cx={x2} cy={y2} r="5" fill="#6366f1" opacity="0.6" />
      </g>
    );
  };

  // ── Cursor ────────────────────────────────────────────────────────────────────
  const cursor = connectDrag ? "crosshair" : panning ? "grabbing" : dragging ? "grabbing" : "default";

  // ── Dot grid background ajustado ao zoom/pan ──────────────────────────────────
  const dotSize = Math.max(1, zoom);
  const gridSize = 24 * zoom;
  const bgOffsetX = pan.x % gridSize;
  const bgOffsetY = pan.y % gridSize;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden select-none"
      style={{
        minHeight: 580,
        backgroundColor: "#f8faff",
        backgroundImage: `radial-gradient(circle, #c7d2fe ${dotSize}px, transparent ${dotSize}px)`,
        backgroundSize: `${gridSize}px ${gridSize}px`,
        backgroundPosition: `${bgOffsetX}px ${bgOffsetY}px`,
        cursor,
      }}
      onMouseDown={handleCanvasMouseDown}
      onClick={e => { if ((e.target as HTMLElement) === containerRef.current) onSelect(null); }}
    >
      {/* Conteúdo transformado (zoom + pan) */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0,
          transformOrigin: "0 0",
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width: 4000, height: 4000,
        }}
      >
        {/* SVG das arestas */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: connectDrag ? "none" : "auto" }}
        >
          <defs>
            <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="6" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#6366f1" />
            </marker>
          </defs>
          {renderConnections()}
          {renderConnectPreview()}
        </svg>

        {/* Nós */}
        {nodes.map(node => (
          <div
            key={node.id}
            onMouseDown={e => handleMouseDown(e, node.id)}
            onMouseEnter={() => connectDrag && setHoverTargetId(node.id)}
            onMouseLeave={() => connectDrag && setHoverTargetId(null)}
            style={{
              position: "absolute", left: node.x, top: node.y,
              cursor: dragging?.id === node.id ? "grabbing" : "grab",
            }}
          >
            <FlowNodeCard
              node={node}
              selected={selectedId === node.id}
              onSelect={onSelect}
              onDelete={handleDelete}
              onPortMouseDown={handlePortMouseDown}
              isConnectTarget={!!connectDrag && connectDrag.sourceId !== node.id}
              isHoverTarget={hoverTargetId === node.id}
            />
          </div>
        ))}

        {nodes.length === 0 && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
            className="flex flex-col items-center text-gray-400 pointer-events-none">
            <Sparkles size={40} className="mb-3 opacity-20" />
            <p className="text-sm font-medium">Canvas vazio</p>
            <p className="text-xs mt-1 opacity-70">Adicione um nó de gatilho para começar</p>
          </div>
        )}
      </div>

      {/* Controles de zoom (canto inferior direito) */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        <button
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold"
          onClick={() => setZoom(z => Math.min(z * 1.2, MAX_ZOOM))}
          title="Zoom in"
        >+</button>
        <button
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 text-xs font-medium"
          onClick={fitView}
          title="Ajustar tela"
        >⊡</button>
        <button
          className="w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-600 hover:bg-gray-50 text-lg font-bold"
          onClick={() => setZoom(z => Math.max(z * 0.8, MIN_ZOOM))}
          title="Zoom out"
        >−</button>
      </div>

      {/* Indicador de zoom */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/80 border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-500 font-mono">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}
