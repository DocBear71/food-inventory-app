'use client';

// file: /src/components/shopping/PrintOptionsModal.js v1 - Print settings and template selection

import React, { useState, useEffect } from 'react';
import { TouchEnhancedButton } from '@/components/mobile/TouchEnhancedButton';
import { ShoppingListPrinter, PRINT_TEMPLATES } from '@/lib/shoppingListPrinter';

export default function PrintOptionsModal({
                                              isOpen,
                                              onClose,
                                              onPrint,
                                              shoppingList,
                                              title = 'Shopping List',
                                              subtitle = null,
                                              storeName = null,
                                              shoppingRoute = null,
                                              totals = null
                                          }) {
    const [selectedTemplate, setSelectedTemplate] = useState('standard');
    const [customOptions, setCustomOptions] = useState({});
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [printing, setPrinting] = useState(false);
    const [printer] = useState(() => new ShoppingListPrinter());

    // Load saved preferences
    useEffect(() => {
        if (isOpen) {
            try {
                const saved = localStorage.getItem('print-preferences');
                if (saved) {
                    const prefs = JSON.parse(saved);
                    setSelectedTemplate(prefs.template || 'standard');
                    setCustomOptions(prefs.options || {});
                }
            } catch (error) {
                console.error('Error loading print preferences:', error);
            }
        }
    }, [isOpen]);

    const savePreferences = () => {
        try {
            localStorage.setItem('print-preferences', JSON.stringify({
                template: selectedTemplate,
                options: customOptions
            }));
        } catch (error) {
            console.error('Error saving print preferences:', error);
        }
    };

    const handlePrint = async () => {
        setPrinting(true);
        savePreferences();

        try {
            const template = PRINT_TEMPLATES[selectedTemplate];
            const printOptions = {
                ...template.options,
                ...customOptions,
                title,
                subtitle,
                storeName,
                shoppingRoute,
                totals
            };

            await printer.printShoppingList(shoppingList, printOptions);

            if (onPrint) {
                onPrint();
            }

            onClose();
        } catch (error) {
            console.error('Print failed:', error);
            const { NativeDialog } = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Print Failed',
                message: 'Printing failed: ' + error.message
            });
        } finally {
            setPrinting(false);
        }
    };

    const handleExportText = async () => {
        try {
            const template = PRINT_TEMPLATES[selectedTemplate];
            const exportOptions = {
                ...template.options,
                ...customOptions,
                title,
                subtitle,
                storeName,
                shoppingRoute,
                totals
            };

            const textContent = printer.exportAsText(shoppingList, exportOptions);

            const blob = new Blob([textContent], {type: 'text/plain'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `shopping-list-${title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Export failed:', error);
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Export Failed',
                message: 'Export failed: ' + error.message
            });
        }
    };

    const handlePreview = async () => {
        try {
            const template = PRINT_TEMPLATES[selectedTemplate];
            const previewOptions = {
                ...template.options,
                ...customOptions,
                title,
                subtitle,
                storeName,
                shoppingRoute,
                totals
            };

            const previewHTML = printer.generatePrintHTML(shoppingList, previewOptions);

            const previewWindow = window.open('', '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
            if (previewWindow) {
                previewWindow.document.write(previewHTML);
                previewWindow.document.close();
            } else {
                const {NativeDialog} = await import('@/components/mobile/NativeDialog');
                await NativeDialog.showAlert({
                    title: 'Pop-up Blocked',
                    message: 'Pop-up blocked. Please allow pop-ups to preview.'
                });
            }
        } catch (error) {
            console.error('Preview failed:', error);
            const {NativeDialog} = await import('@/components/mobile/NativeDialog');
            await NativeDialog.showError({
                title: 'Preview Failed',
                message: 'Preview failed: ' + error.message
            });
        }
    };

    if (!isOpen) return null;

    const currentTemplate = PRINT_TEMPLATES[selectedTemplate];

    return (
        <div style={{
            position: 'fixed',
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '1.5rem',
                maxWidth: '500px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1.5rem'
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: '1.25rem',
                        fontWeight: '600',
                        color: '#111827'
                    }}>
                        🖨️ Print Shopping List
                    </h2>
                    <TouchEnhancedButton
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '1.5rem',
                            color: '#6b7280',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Template Selection */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.75rem'
                    }}>
                        📋 Print Template
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '0.75rem'
                    }}>
                        {Object.entries(PRINT_TEMPLATES).map(([key, template]) => (
                            <TouchEnhancedButton
                                key={key}
                                onClick={() => setSelectedTemplate(key)}
                                style={{
                                    padding: '0.75rem',
                                    border: selectedTemplate === key ? '2px solid #3b82f6' : '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    backgroundColor: selectedTemplate === key ? '#eff6ff' : 'white',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <div style={{
                                    fontWeight: '500',
                                    color: '#111827',
                                    marginBottom: '0.25rem'
                                }}>
                                    {template.name}
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: '#6b7280'
                                }}>
                                    {template.description}
                                </div>
                            </TouchEnhancedButton>
                        ))}
                    </div>
                </div>

                {/* Quick Options */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        marginBottom: '0.75rem'
                    }}>
                        ⚙️ Quick Options
                    </label>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '0.5rem'
                    }}>
                        {[
                            { key: 'showPrices', label: '💰 Show Prices' },
                            { key: 'showRecipes', label: '📝 Show Recipes' },
                            { key: 'showInventoryStatus', label: '✅ Show Inventory' },
                            { key: 'showTotals', label: '🧮 Show Totals' }
                        ].map(({ key, label }) => (
                            <label key={key} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.875rem',
                                color: '#374151',
                                cursor: 'pointer'
                            }}>
                                <input
                                    type="checkbox"
                                    checked={customOptions[key] !== undefined ?
                                        customOptions[key] :
                                        currentTemplate.options[key]}
                                    onChange={(e) => setCustomOptions(prev => ({
                                        ...prev,
                                        [key]: e.target.checked
                                    }))}
                                    style={{
                                        width: '1rem',
                                        height: '1rem',
                                        accentColor: '#3b82f6'
                                    }}
                                />
                                {label}
                            </label>
                        ))}
                    </div>
                </div>

                {/* Advanced Options Toggle */}
                <div style={{ marginBottom: '1.5rem' }}>
                    <TouchEnhancedButton
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <span>{showAdvanced ? '▼' : '▶'}</span>
                        Advanced Options
                    </TouchEnhancedButton>
                </div>

                {/* Advanced Options */}
                {showAdvanced && (
                    <div style={{
                        marginBottom: '1.5rem',
                        padding: '1rem',
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(2, 1fr)',
                            gap: '1rem'
                        }}>
                            {/* Font Size */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.25rem'
                                }}>
                                    Font Size
                                </label>
                                <select
                                    value={customOptions.fontSize || currentTemplate.options.fontSize}
                                    onChange={(e) => setCustomOptions(prev => ({
                                        ...prev,
                                        fontSize: e.target.value
                                    }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="9pt">Small (9pt)</option>
                                    <option value="10pt">Medium (10pt)</option>
                                    <option value="11pt">Large (11pt)</option>
                                    <option value="12pt">Extra Large (12pt)</option>
                                </select>
                            </div>

                            {/* Columns */}
                            <div>
                                <label style={{
                                    display: 'block',
                                    fontSize: '0.75rem',
                                    fontWeight: '500',
                                    color: '#374151',
                                    marginBottom: '0.25rem'
                                }}>
                                    Columns
                                </label>
                                <select
                                    value={customOptions.columnsPerPage || currentTemplate.options.columnsPerPage}
                                    onChange={(e) => setCustomOptions(prev => ({
                                        ...prev,
                                        columnsPerPage: parseInt(e.target.value)
                                    }))}
                                    style={{
                                        width: '100%',
                                        padding: '0.5rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '4px',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <option value={1}>1 Column</option>
                                    <option value={2}>2 Columns</option>
                                    <option value={3}>3 Columns</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '0.75rem',
                    marginBottom: '1rem'
                }}>
                    <TouchEnhancedButton
                        onClick={handlePreview}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        👁️ Preview
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handleExportText}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: '#0891b2',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: 'pointer'
                        }}
                    >
                        📄 Export Text
                    </TouchEnhancedButton>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: '0.75rem'
                }}>
                    <TouchEnhancedButton
                        onClick={onClose}
                        disabled={printing}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: '#f3f4f6',
                            color: '#374151',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: printing ? 'not-allowed' : 'pointer',
                            opacity: printing ? 0.6 : 1
                        }}
                    >
                        Cancel
                    </TouchEnhancedButton>
                    <TouchEnhancedButton
                        onClick={handlePrint}
                        disabled={printing}
                        style={{
                            padding: '0.75rem',
                            backgroundColor: printing ? '#9ca3af' : '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            cursor: printing ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {printing ? (
                            <>
                                <div style={{
                                    width: '1rem',
                                    height: '1rem',
                                    border: '2px solid transparent',
                                    borderTop: '2px solid white',
                                    borderRadius: '50%',
                                    animation: 'spin 1s linear infinite'
                                }} />
                                Printing...
                            </>
                        ) : (
                            <>🖨️ Print Shopping List</>
                        )}
                    </TouchEnhancedButton>
                </div>

                {/* Print Tips */}
                <div style={{
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: '#eff6ff',
                    borderRadius: '6px',
                    border: '1px solid #bfdbfe'
                }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: '#1e40af',
                        fontWeight: '500',
                        marginBottom: '0.25rem'
                    }}>
                        💡 Print Tips:
                    </div>
                    <ul style={{
                        fontSize: '0.75rem',
                        color: '#1e40af',
                        marginLeft: '1rem',
                        lineHeight: '1.4'
                    }}>
                        <li>Use Preview to check layout before printing</li>
                        <li>For mobile: Share → Print or Save as PDF</li>
                        <li>Text export works great for simple lists</li>
                        <li>Store layout template includes shopping route</li>
                    </ul>
                </div>
            </div>

            <style jsx>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
