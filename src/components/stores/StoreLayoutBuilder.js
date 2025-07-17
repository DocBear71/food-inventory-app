'use client';

// file: /src/components/stores/StoreLayoutBuilder.js v1 - Visual store layout editor for Doc Bear's Comfort Kitchen

import { useState, useRef, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { MobileHaptics } from '@/components/mobile/MobileHaptics';

export default function StoreLayoutBuilder({ store, onSave, onClose }) {
    const [layout, setLayout] = useState(store?.layout || getDefaultLayout());
    const [selectedSection, setSelectedSection] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [viewMode, setViewMode] = useState('edit'); // 'edit' or 'preview'
    const [showGrid, setShowGrid] = useState(true);
    const canvasRef = useRef(null);

    // Available section types
    const sectionTypes = [
        { id: 'produce', name: 'Produce', icon: '🥬', color: '#10b981' },
        { id: 'meat', name: 'Meat & Seafood', icon: '🥩', color: '#ef4444' },
        { id: 'dairy', name: 'Dairy', icon: '🥛', color: '#3b82f6' },
        { id: 'frozen', name: 'Frozen', icon: '🧊', color: '#06b6d4' },
        { id: 'pantry', name: 'Pantry', icon: '🥫', color: '#f59e0b' },
        { id: 'bakery', name: 'Bakery', icon: '🍞', color: '#d97706' },
        { id: 'deli', name: 'Deli', icon: '🧀', color: '#8b5cf6' },
        { id: 'pharmacy', name: 'Pharmacy', icon: '💊', color: '#ec4899' },
        { id: 'checkout', name: 'Checkout', icon: '🛒', color: '#6b7280' },
        { id: 'entrance', name: 'Entrance', icon: '🚪', color: '#374151' }
    ];

    // Default layout for new stores
    function getDefaultLayout() {
        return {
            sections: [
                { id: '1', type: 'entrance', x: 400, y: 50, width: 100, height: 50, name: 'Main Entrance' },
                { id: '2', type: 'produce', x: 50, y: 150, width: 150, height: 100, name: 'Fresh Produce' },
                { id: '3', type: 'meat', x: 250, y: 150, width: 120, height: 80, name: 'Meat Counter' },
                { id: '4', type: 'dairy', x: 450, y: 150, width: 120, height: 80, name: 'Dairy' },
                { id: '5', type: 'frozen', x: 650, y: 150, width: 120, height: 80, name: 'Frozen Foods' },
                { id: '6', type: 'pantry', x: 50, y: 300, width: 200, height: 120, name: 'Pantry Items' },
                { id: '7', type: 'bakery', x: 300, y: 300, width: 150, height: 80, name: 'Bakery' },
                { id: '8', type: 'checkout', x: 500, y: 450, width: 200, height: 60, name: 'Checkout Lanes' }
            ],
            metadata: {
                gridSize: 20,
                canvasWidth: 800,
                canvasHeight: 600,
                version: '1.0'
            }
        };
    }

    // Handle drag start
    const handleMouseDown = (e, section) => {
        if (viewMode !== 'edit') return;

        e.preventDefault();
        setIsDragging(true);
        setSelectedSection(section);

        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left - section.x,
            y: e.clientY - rect.top - section.y
        });

        MobileHaptics?.light();
    };

    // Handle drag move
    const handleMouseMove = (e) => {
        if (!isDragging || !selectedSection || viewMode !== 'edit') return;

        const rect = canvasRef.current.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.x;
        const newY = e.clientY - rect.top - dragOffset.y;

        // Snap to grid if enabled
        const gridSize = layout.metadata.gridSize;
        const snappedX = showGrid ? Math.round(newX / gridSize) * gridSize : newX;
        const snappedY = showGrid ? Math.round(newY / gridSize) * gridSize : newY;

        // Update section position
        setLayout(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === selectedSection.id
                    ? { ...section, x: Math.max(0, snappedX), y: Math.max(0, snappedY) }
                    : section
            )
        }));
    };

    // Handle drag end
    const handleMouseUp = () => {
        setIsDragging(false);
        setSelectedSection(null);
        MobileHaptics?.medium();
    };

    // Add event listeners
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, selectedSection, dragOffset, showGrid]);

    // Add new section
    const addSection = (type) => {
        const sectionType = sectionTypes.find(t => t.id === type);
        const newSection = {
            id: Date.now().toString(),
            type: type,
            x: 100,
            y: 100,
            width: 120,
            height: 80,
            name: sectionType.name
        };

        setLayout(prev => ({
            ...prev,
            sections: [...prev.sections, newSection]
        }));

        MobileHaptics?.success();
    };

    // Delete section
    const deleteSection = (sectionId) => {
        setLayout(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== sectionId)
        }));

        MobileHaptics?.medium();
    };

    // Save layout
    const handleSave = async () => {
        try {
            const layoutData = {
                storeId: store._id,
                layout: layout,
                metadata: {
                    ...layout.metadata,
                    lastModified: new Date().toISOString(),
                    createdBy: 'user', // Would be actual user ID
                    version: '1.0'
                }
            };

            await onSave(layoutData);
            MobileHaptics?.success();
        } catch (error) {
            console.error('Failed to save layout:', error);
            MobileHaptics?.error();
        }
    };

    // Get section style
    const getSectionStyle = (section) => {
        const sectionType = sectionTypes.find(t => t.id === section.type);
        return {
            position: 'absolute',
            left: section.x,
            top: section.y,
            width: section.width,
            height: section.height,
            backgroundColor: sectionType?.color + '20',
            border: `2px solid ${sectionType?.color}`,
            borderRadius: '8px',
            cursor: viewMode === 'edit' ? 'move' : 'default',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: '500',
            color: sectionType?.color,
            userSelect: 'none',
            transition: isDragging ? 'none' : 'all 0.2s ease'
        };
    };

    return (
        <div className="fixed inset-0 z-50 bg-white">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">🗺️ Store Layout Builder</h1>
                        <p className="text-sm text-indigo-100">{store?.name}</p>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* View Mode Toggle */}
                        <div className="flex border border-indigo-400 rounded-lg overflow-hidden">
                            <TouchEnhancedButton
                                onClick={() => setViewMode('edit')}
                                className={`px-3 py-1 text-sm ${
                                    viewMode === 'edit'
                                        ? 'bg-white text-indigo-600'
                                        : 'text-white hover:bg-indigo-500'
                                }`}
                            >
                                ✏️ Edit
                            </TouchEnhancedButton>
                            <TouchEnhancedButton
                                onClick={() => setViewMode('preview')}
                                className={`px-3 py-1 text-sm ${
                                    viewMode === 'preview'
                                        ? 'bg-white text-indigo-600'
                                        : 'text-white hover:bg-indigo-500'
                                }`}
                            >
                                👁️ Preview
                            </TouchEnhancedButton>
                        </div>

                        <TouchEnhancedButton
                            onClick={onClose}
                            className="text-white hover:text-indigo-200 text-xl"
                        >
                            ×
                        </TouchEnhancedButton>
                    </div>
                </div>
            </div>

            <div className="flex h-full">
                {/* Sidebar - Section Tools */}
                {viewMode === 'edit' && (
                    <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
                        <div className="space-y-4">
                            {/* Grid Toggle */}
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">Show Grid</span>
                                <TouchEnhancedButton
                                    onClick={() => setShowGrid(!showGrid)}
                                    className={`w-12 h-6 rounded-full relative transition-colors ${
                                        showGrid ? 'bg-indigo-600' : 'bg-gray-300'
                                    }`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                                        showGrid ? 'translate-x-6' : 'translate-x-0.5'
                                    }`} />
                                </TouchEnhancedButton>
                            </div>

                            {/* Add Sections */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Add Sections</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {sectionTypes.map(type => (
                                        <TouchEnhancedButton
                                            key={type.id}
                                            onClick={() => addSection(type.id)}
                                            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-100 text-center"
                                            style={{ borderColor: type.color + '40' }}
                                        >
                                            <div className="text-lg mb-1">{type.icon}</div>
                                            <div className="text-xs font-medium" style={{ color: type.color }}>
                                                {type.name}
                                            </div>
                                        </TouchEnhancedButton>
                                    ))}
                                </div>
                            </div>

                            {/* Section List */}
                            <div>
                                <h3 className="text-sm font-medium text-gray-900 mb-3">Current Sections</h3>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {layout.sections.map(section => {
                                        const sectionType = sectionTypes.find(t => t.id === section.type);
                                        return (
                                            <div
                                                key={section.id}
                                                className="flex items-center justify-between p-2 bg-white rounded border"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span>{sectionType?.icon}</span>
                                                    <span className="text-sm">{section.name}</span>
                                                </div>
                                                <TouchEnhancedButton
                                                    onClick={() => deleteSection(section.id)}
                                                    className="text-red-500 hover:text-red-700 text-sm"
                                                >
                                                    🗑️
                                                </TouchEnhancedButton>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Canvas Area */}
                <div className="flex-1 overflow-auto bg-gray-100">
                    <div className="p-4">
                        {/* Canvas Controls */}
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Canvas: {layout.metadata.canvasWidth} × {layout.metadata.canvasHeight}
                </span>
                                {viewMode === 'edit' && (
                                    <span className="text-sm text-gray-600">
                    Grid: {showGrid ? 'On' : 'Off'} ({layout.metadata.gridSize}px)
                  </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {viewMode === 'edit' && (
                                    <TouchEnhancedButton
                                        onClick={() => setLayout(getDefaultLayout())}
                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
                                    >
                                        🔄 Reset
                                    </TouchEnhancedButton>
                                )}

                                <TouchEnhancedButton
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                                >
                                    💾 Save Layout
                                </TouchEnhancedButton>
                            </div>
                        </div>

                        {/* Canvas */}
                        <div className="relative bg-white border-2 border-gray-300 rounded-lg overflow-hidden">
                            <div
                                ref={canvasRef}
                                className="relative"
                                style={{
                                    width: layout.metadata.canvasWidth,
                                    height: layout.metadata.canvasHeight,
                                    minWidth: '800px',
                                    minHeight: '600px'
                                }}
                            >
                                {/* Grid Background */}
                                {showGrid && viewMode === 'edit' && (
                                    <div
                                        className="absolute inset-0 opacity-20"
                                        style={{
                                            backgroundImage: `
                        linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                        linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                      `,
                                            backgroundSize: `${layout.metadata.gridSize}px ${layout.metadata.gridSize}px`
                                        }}
                                    />
                                )}

                                {/* Store Sections */}
                                {layout.sections.map(section => {
                                    const sectionType = sectionTypes.find(t => t.id === section.type);
                                    return (
                                        <div
                                            key={section.id}
                                            style={getSectionStyle(section)}
                                            onMouseDown={(e) => handleMouseDown(e, section)}
                                            className={`${
                                                selectedSection?.id === section.id ? 'ring-2 ring-indigo-500' : ''
                                            } ${viewMode === 'edit' ? 'hover:shadow-lg' : ''}`}
                                        >
                                            <div className="text-xl mb-1">{sectionType?.icon}</div>
                                            <div className="text-center px-1">{section.name}</div>

                                            {/* Section coordinates (edit mode) */}
                                            {viewMode === 'edit' && (
                                                <div className="absolute -top-6 left-0 text-xs text-gray-500">
                                                    {section.x}, {section.y}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {/* Shopping Flow Arrows (preview mode) */}
                                {viewMode === 'preview' && (
                                    <svg
                                        className="absolute inset-0 pointer-events-none"
                                        width="100%"
                                        height="100%"
                                    >
                                        {/* Example flow arrows - would be generated based on optimal shopping route */}
                                        <defs>
                                            <marker
                                                id="arrowhead"
                                                markerWidth="10"
                                                markerHeight="7"
                                                refX="9"
                                                refY="3.5"
                                                orient="auto"
                                            >
                                                <polygon
                                                    points="0 0, 10 3.5, 0 7"
                                                    fill="#4f46e5"
                                                />
                                            </marker>
                                        </defs>
                                        {/* Example flow path from entrance to checkout */}
                                        {layout.sections.length > 0 && (
                                            <>
                                                <path
                                                    d={`M ${layout.sections[0]?.x + 50} ${layout.sections[0]?.y + 25} 
                              L ${layout.sections[1]?.x + 75} ${layout.sections[1]?.y + 50}
                              L ${layout.sections[2]?.x + 60} ${layout.sections[2]?.y + 40}
                              L ${layout.sections[3]?.x + 60} ${layout.sections[3]?.y + 40}`}
                                                    stroke="#4f46e5"
                                                    strokeWidth="2"
                                                    fill="none"
                                                    strokeDasharray="5,5"
                                                    markerEnd="url(#arrowhead)"
                                                    opacity="0.7"
                                                />
                                            </>
                                        )}
                                    </svg>
                                )}
                            </div>
                        </div>

                        {/* Instructions */}
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-medium text-blue-900 mb-2">
                                {viewMode === 'edit' ? '✏️ Edit Mode Instructions' : '👁️ Preview Mode'}
                            </h4>
                            <ul className="text-sm text-blue-800 space-y-1">
                                {viewMode === 'edit' ? (
                                    <>
                                        <li>• Drag sections to move them around the store layout</li>
                                        <li>• Use the sidebar to add new sections or delete existing ones</li>
                                        <li>• Toggle grid snapping for precise alignment</li>
                                        <li>• Click "Save Layout" when you're satisfied with the arrangement</li>
                                    </>
                                ) : (
                                    <>
                                        <li>• This is how your store layout will appear to shoppers</li>
                                        <li>• Optimal shopping routes will be calculated based on this layout</li>
                                        <li>• Switch to Edit mode to make changes</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}