'use client';
// file: /src/components/shared/EmailShareModal.js v1


import { useState, useEffect } from 'react';
import { useSafeSession } from '@/hooks/useSafeSession';
import {TouchEnhancedButton} from '@/components/mobile/TouchEnhancedButton';
import { getApiUrl } from '@/lib/api-config';

export default function EmailShareModal({
                                            isOpen,
                                            onClose,
                                            shoppingList,
                                            context = 'recipes',
                                            contextName = 'Selected Recipes'
                                        }) {
    const { data: session } = useSafeSession();
    const [recipients, setRecipients] = useState(['']);
    const [personalMessage, setPersonalMessage] = useState('');
    const [contacts, setContacts] = useState([]);
    const [showContactForm, setShowContactForm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [emailPreview, setEmailPreview] = useState(false);

    // New contact form
    const [newContact, setNewContact] = useState({
        name: '',
        email: '',
        relationship: 'other'
    });

    useEffect(() => {
        if (isOpen) {
            fetchContacts();
            setError('');
            setSuccess('');
        }
    }, [isOpen]);

    const fetchContacts = async () => {
        try {
            const response = await fetch(getApiUrl('/api/contacts'));
            const data = await response.json();
            if (data.success) {
                setContacts(data.contacts);
            }
        } catch (error) {
            console.error('Error fetching contacts:', error);
        }
    };

    const addRecipientField = () => {
        setRecipients([...recipients, '']);
    };

    const removeRecipientField = (index) => {
        if (recipients.length > 1) {
            setRecipients(recipients.filter((_, i) => i !== index));
        }
    };

    const updateRecipient = (index, value) => {
        const updated = [...recipients];
        updated[index] = value;
        setRecipients(updated);
    };

    const selectContact = (contact) => {
        const emptyIndex = recipients.findIndex(r => r === '');
        if (emptyIndex !== -1) {
            updateRecipient(emptyIndex, contact.email);
        } else {
            setRecipients([...recipients, contact.email]);
        }
    };

    const addContact = async () => {
        if (!newContact.name || !newContact.email) {
            setError('Name and email are required for new contact');
            return;
        }

        try {
            const response = await fetch(getApiUrl('/api/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newContact)
            }));

            const data = await response.json();
            if (data.success) {
                setContacts([...contacts, data.contact]);
                setNewContact({ name: '', email: '', relationship: 'other' });
                setShowContactForm(false);
                selectContact(data.contact);
            } else {
                setError(data.error);
            }
        } catch (error) {
            setError('Failed to add contact');
        }
    };

    const sendEmail = async () => {
        setIsLoading(true);
        setError('');
        setSuccess('');

        // Validate recipients
        const validRecipients = recipients.filter(email => email.trim().length > 0);
        if (validRecipients.length === 0) {
            setError('Please add at least one recipient');
            setIsLoading(false);
            return;
        }

        // Validate email formats
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const invalidEmails = validRecipients.filter(email => !emailRegex.test(email.trim()));
        if (invalidEmails.length > 0) {
            setError(`Invalid email format: ${invalidEmails.join(', ')}`);
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch(getApiUrl('/api/email/send-shopping-list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipients: validRecipients,
                    personalMessage,
                    shoppingList,
                    context,
                    contextName
                })
            }));

            const data = await response.json();

            if (data.success) {
                setSuccess(`Shopping list sent successfully to ${data.recipientCount} recipient${data.recipientCount > 1 ? 's' : ''}!`);
                setTimeout(() => {
                    onClose();
                    resetForm();
                }, 2000);
            } else {
                setError(data.error || 'Failed to send email');
            }
        } catch (error) {
            setError('Failed to send email. Please try again.');
            console.error('Email send error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const resetForm = () => {
        setRecipients(['']);
        setPersonalMessage('');
        setError('');
        setSuccess('');
        setShowContactForm(false);
        setEmailPreview(false);
    };

    const getShoppingListSummary = () => {
        if (!shoppingList) return null;

        // Handle different shopping list structures
        let totalItems = 0;
        let needToBuy = 0;
        let inInventory = 0;

        if (shoppingList.stats) {
            totalItems = shoppingList.stats.totalItems || 0;
            needToBuy = shoppingList.stats.needToBuy || 0;
            inInventory = shoppingList.stats.inInventory || shoppingList.stats.alreadyHave || 0;
        } else if (shoppingList.summary) {
            totalItems = shoppingList.summary.totalItems || 0;
            needToBuy = shoppingList.summary.needToBuy || 0;
            inInventory = shoppingList.summary.alreadyHave || 0;
        } else {
            // Calculate from items if no stats available
            let items = [];
            if (shoppingList.items) {
                if (Array.isArray(shoppingList.items)) {
                    items = shoppingList.items;
                } else if (typeof shoppingList.items === 'object') {
                    items = Object.values(shoppingList.items).flat();
                }
            }
            totalItems = items.length;
            inInventory = items.filter(item => item.inInventory || item.haveAmount > 0).length;
            needToBuy = totalItems - inInventory;
        }

        return { totalItems, needToBuy, inInventory };
    };

    if (!isOpen) return null;

    const summary = getShoppingListSummary();

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                width: '100%',
                maxWidth: '600px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
                {/* Header */}
                <div style={{
                    padding: '1.5rem',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            color: '#111827'
                        }}>
                            📧 Share Shopping List
                        </h2>
                        <p style={{
                            margin: '0.25rem 0 0 0',
                            fontSize: '0.875rem',
                            color: '#6b7280'
                        }}>
                            {contextName}
                        </p>
                    </div>
                    <TouchEnhancedButton
                        onClick={() => { onClose(); resetForm(); }}
                        style={{
                            color: '#9ca3af',
                            backgroundColor: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.5rem',
                            padding: '0.5rem'
                        }}
                    >
                        ×
                    </TouchEnhancedButton>
                </div>

                {/* Shopping List Summary */}
                {summary && (
                    <div style={{
                        padding: '1rem 1.5rem',
                        backgroundColor: '#f8f9fa',
                        borderBottom: '1px solid #e5e7eb',
                        flexShrink: 0
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            fontSize: '0.875rem'
                        }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {summary.totalItems}
                                </div>
                                <div style={{ color: '#6b7280' }}>Total Items</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>
                                    {summary.needToBuy}
                                </div>
                                <div style={{ color: '#6b7280' }}>Need to Buy</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981' }}>
                                    {summary.inInventory}
                                </div>
                                <div style={{ color: '#6b7280' }}>In Inventory</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div style={{
                    flex: 1,
                    padding: '1.5rem',
                    overflowY: 'auto',
                    minHeight: 0
                }}>
                    {/* Error/Success Messages */}
                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            color: '#dc2626',
                            fontSize: '0.875rem'
                        }}>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div style={{
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            backgroundColor: '#f0fdf4',
                            border: '1px solid #bbf7d0',
                            borderRadius: '6px',
                            color: '#16a34a',
                            fontSize: '0.875rem'
                        }}>
                            {success}
                        </div>
                    )}

                    {/* Recipients Section */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Recipients *
                        </label>

                        {recipients.map((recipient, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                gap: '0.5rem',
                                marginBottom: '0.5rem',
                                alignItems: 'center'
                            }}>
                                <input
                                    type="email"
                                    placeholder="Enter email address"
                                    value={recipient}
                                    onChange={(e) => updateRecipient(index, e.target.value)}
                                    style={{
                                        flex: 1,
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                {recipients.length > 1 && (
                                    <TouchEnhancedButton
                                        type="button"
                                        onClick={() => removeRecipientField(index)}
                                        style={{
                                            color: '#dc2626',
                                            backgroundColor: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: '0.5rem',
                                            fontSize: '1.25rem'
                                        }}
                                    >
                                        ×
                                    </TouchEnhancedButton>
                                )}
                            </div>
                        ))}

                        <TouchEnhancedButton
                            type="button"
                            onClick={addRecipientField}
                            style={{
                                color: '#4f46e5',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textDecoration: 'underline',
                                padding: '0.25rem 0'
                            }}
                        >
                            + Add another recipient
                        </TouchEnhancedButton>
                    </div>

                    {/* Contacts Section */}
                    {contacts.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                color: '#374151',
                                marginBottom: '0.5rem'
                            }}>
                                Quick Add from Contacts
                            </label>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '0.5rem'
                            }}>
                                {contacts.slice(0, 6).map(contact => (
                                    <TouchEnhancedButton
                                        key={contact.id}
                                        type="button"
                                        onClick={() => selectContact(contact)}
                                        style={{
                                            padding: '0.5rem 0.75rem',
                                            backgroundColor: '#f3f4f6',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '0.25rem'
                                        }}
                                    >
                                        {contact.name}
                                    </TouchEnhancedButton>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Add Contact Form */}
                    {showContactForm ? (
                        <div style={{
                            marginBottom: '1.5rem',
                            padding: '1rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '1rem'
                            }}>
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '500' }}>
                                    Add New Contact
                                </h4>
                                <TouchEnhancedButton
                                    onClick={() => setShowContactForm(false)}
                                    style={{
                                        color: '#6b7280',
                                        backgroundColor: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    ×
                                </TouchEnhancedButton>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                <input
                                    type="email"
                                    placeholder="Email"
                                    value={newContact.email}
                                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem'
                                    }}
                                />
                                <select
                                    value={newContact.relationship}
                                    onChange={(e) => setNewContact({...newContact, relationship: e.target.value})}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '6px',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    <option value="family">Family</option>
                                    <option value="friend">Friend</option>
                                    <option value="roommate">Roommate</option>
                                    <option value="colleague">Colleague</option>
                                    <option value="other">Other</option>
                                </select>
                                <TouchEnhancedButton
                                    onClick={addContact}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        backgroundColor: '#4f46e5',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem'
                                    }}
                                >
                                    Add Contact
                                </TouchEnhancedButton>
                            </div>
                        </div>
                    ) : (
                        <TouchEnhancedButton
                            type="button"
                            onClick={() => setShowContactForm(true)}
                            style={{
                                color: '#4f46e5',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textDecoration: 'underline',
                                marginBottom: '1.5rem',
                                padding: '0.25rem 0'
                            }}
                        >
                            + Add new contact
                        </TouchEnhancedButton>
                    )}

                    {/* Personal Message */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                            display: 'block',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151',
                            marginBottom: '0.5rem'
                        }}>
                            Personal Message (Optional)
                        </label>
                        <textarea
                            placeholder="Add a personal message to include with the shopping list..."
                            value={personalMessage}
                            onChange={(e) => setPersonalMessage(e.target.value)}
                            rows={3}
                            maxLength={500}
                            style={{
                                width: '100%',
                                padding: '0.75rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                resize: 'vertical',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{
                            fontSize: '0.75rem',
                            color: '#9ca3af',
                            marginTop: '0.25rem'
                        }}>
                            {personalMessage.length}/500 characters
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{
                    padding: '1rem 1.5rem',
                    borderTop: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '0.75rem',
                    flexShrink: 0
                }}>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                        Email will be sent from: {session?.user?.email}
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <TouchEnhancedButton
                            onClick={() => { onClose(); resetForm(); }}
                            disabled={isLoading}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem'
                            }}
                        >
                            Cancel
                        </TouchEnhancedButton>
                        <TouchEnhancedButton
                            onClick={sendEmail}
                            disabled={isLoading || recipients.filter(r => r.trim()).length === 0}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: isLoading || recipients.filter(r => r.trim()).length === 0 ? '#9ca3af' : '#4f46e5',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: isLoading || recipients.filter(r => r.trim()).length === 0 ? 'not-allowed' : 'pointer',
                                fontSize: '0.875rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                            }}
                        >
                            {isLoading ? (
                                <>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '2px solid transparent',
                                        borderTop: '2px solid white',
                                        borderRadius: '50%',
                                        animation: 'spin 1s linear infinite'
                                    }}></div>
                                    Sending...
                                </>
                            ) : (
                                <>📧 Send Shopping List</>
                            )}
                        </TouchEnhancedButton>
                    </div>
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