// file: /src/app/api/contacts/route.js v1

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

import connectDB from '@/lib/mongodb';
import { Contact } from '@/lib/models';
import { validateEmail } from '@/lib/email';

// GET - Fetch user's contacts
export async function GET(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await connectDB();

        const contacts = await Contact.find({
            userId: session.user.id,
            isActive: true
        }).sort({ name: 1 });

        return NextResponse.json({
            success: true,
            contacts: contacts.map(contact => ({
                id: contact._id,
                name: contact.name,
                email: contact.email,
                relationship: contact.relationship,
                groups: contact.groups,
                stats: contact.stats
            }))
        });

    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }
}

// POST - Add new contact
export async function POST(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { name, email, relationship, groups, notes } = await request.json();

        // Validation
        if (!name || !email) {
            return NextResponse.json({
                error: 'Name and email are required'
            }, { status: 400 });
        }

        if (!validateEmail(email)) {
            return NextResponse.json({
                error: 'Invalid email format'
            }, { status: 400 });
        }

        await connectDB();

        // Check if contact already exists for this user
        const existingContact = await Contact.findOne({
            userId: session.user.id,
            email: email.toLowerCase().trim()
        });

        if (existingContact) {
            return NextResponse.json({
                error: 'Contact with this email already exists'
            }, { status: 400 });
        }

        // Create new contact
        const contact = new Contact({
            userId: session.user.id,
            name: name.trim(),
            email: email.toLowerCase().trim(),
            relationship: relationship || 'other',
            groups: groups || [],
            notes: notes || ''
        });

        await contact.save();

        return NextResponse.json({
            success: true,
            message: 'Contact added successfully',
            contact: {
                id: contact._id,
                name: contact.name,
                email: contact.email,
                relationship: contact.relationship,
                groups: contact.groups
            }
        });

    } catch (error) {
        console.error('Error adding contact:', error);
        return NextResponse.json({ error: 'Failed to add contact' }, { status: 500 });
    }
}

// DELETE - Remove contact
export async function DELETE(request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const contactId = searchParams.get('id');

        if (!contactId) {
            return NextResponse.json({ error: 'Contact ID is required' }, { status: 400 });
        }

        await connectDB();

        const contact = await Contact.findOneAndUpdate(
            { _id: contactId, userId: session.user.id },
            { isActive: false, updatedAt: new Date() },
            { new: true }
        );

        if (!contact) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: 'Contact removed successfully'
        });

    } catch (error) {
        console.error('Error removing contact:', error);
        return NextResponse.json({ error: 'Failed to remove contact' }, { status: 500 });
    }
}