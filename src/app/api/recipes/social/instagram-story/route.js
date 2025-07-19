// file: /src/app/api/recipes/social/instagram-story/route.js - Complete Instagram Story Generator

import { NextResponse } from 'next/server';
import { getEnhancedSession } from '@/lib/api-auth';
import connectDB from '@/lib/mongodb';
import { Recipe, RecipePhoto } from '@/lib/models';

// Instagram Story dimensions
const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

export async function POST(request) {
    try {
        const session = await getEnhancedSession(request);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        const { recipeId, template = 'modern', includeQR = true } = await request.json();

        if (!recipeId) {
            return NextResponse.json({ error: 'Recipe ID is required' }, { status: 400 });
        }

        await connectDB();

        // Get recipe details
        const recipe = await Recipe.findById(recipeId)
            .populate('createdBy', 'name')
            .lean();

        if (!recipe) {
            return NextResponse.json({ error: 'Recipe not found' }, { status: 404 });
        }

        // Check if user owns this recipe or if it's public
        if (!recipe.isPublic && recipe.createdBy._id.toString() !== session.user.id) {
            return NextResponse.json({ error: 'Not authorized to create story for this recipe' }, { status: 403 });
        }

        // Get recipe photos
        const photos = await RecipePhoto.find({ recipeId }).sort({ isPrimary: -1, uploadedAt: -1 }).limit(3);

        // Generate the story image
        const storyBuffer = await generateStoryImage(recipe, photos, template, includeQR);

        // Return the image as response
        return new NextResponse(storyBuffer, {
            headers: {
                'Content-Type': 'image/png',
                'Content-Disposition': `attachment; filename="recipe-story-${recipe.title.replace(/[^a-zA-Z0-9]/g, '-')}.png"`,
                'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            },
        });

    } catch (error) {
        console.error('Error generating Instagram story:', error);
        return NextResponse.json({
            error: 'Failed to generate story image',
            details: error.message
        }, { status: 500 });
    }
}

async function generateStoryImage(recipe, photos, template, includeQR) {
    // Dynamic import to avoid build-time issues
    const { createCanvas, loadImage } = await import('canvas');

    ensureRoundRectPolyfill();

    const canvas = createCanvas(STORY_WIDTH, STORY_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Enable font smoothing
    ctx.textBaseline = 'top';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    switch (template) {
        case 'modern':
            await drawModernTemplate(ctx, recipe, photos, includeQR);
            break;
        case 'classic':
            await drawClassicTemplate(ctx, recipe, photos, includeQR);
            break;
        case 'minimal':
            await drawMinimalTemplate(ctx, recipe, photos, includeQR);
            break;
        default:
            await drawModernTemplate(ctx, recipe, photos, includeQR);
    }

    return canvas.toBuffer('image/png');
}

async function drawModernTemplate(ctx, recipe, photos, includeQR) {
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, STORY_HEIGHT);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    // Top section with recipe photo
    if (photos.length > 0) {
        try {
            const primaryPhoto = photos[0];
            let photoBuffer;

            if (primaryPhoto.data) {
                // MongoDB binary storage
                photoBuffer = primaryPhoto.data;
            } else {
                // Legacy file system - would need to read from file
                console.warn('Legacy photo format not fully supported in story generation');
            }

            if (photoBuffer) {
                const { loadImage } = await import('canvas');
                const img = await loadImage(photoBuffer);

                // Create circular mask for photo
                const photoSize = 300;
                const photoX = (STORY_WIDTH - photoSize) / 2;
                const photoY = 200;

                ctx.save();
                ctx.beginPath();
                ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
                ctx.clip();

                // Draw photo with proper scaling
                const scale = Math.max(photoSize / img.width, photoSize / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const imgX = photoX + (photoSize - scaledWidth) / 2;
                const imgY = photoY + (photoSize - scaledHeight) / 2;

                ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                ctx.restore();

                // Add photo border
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 8;
                ctx.beginPath();
                ctx.arc(photoX + photoSize/2, photoY + photoSize/2, photoSize/2, 0, Math.PI * 2);
                ctx.stroke();
            }
        } catch (error) {
            console.error('Error loading recipe photo:', error);
            // Draw placeholder circle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.beginPath();
            ctx.arc(STORY_WIDTH/2, 350, 150, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // No photo - draw placeholder
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.arc(STORY_WIDTH/2, 350, 150, 0, Math.PI * 2);
        ctx.fill();

        // Add camera icon
        ctx.fillStyle = '#ffffff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('📸', STORY_WIDTH/2, 320);
    }

    // Recipe title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';

    // Word wrap for long titles
    const words = recipe.title.split(' ');
    let lines = [];
    let currentLine = '';

    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > STORY_WIDTH - 100 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    // Draw title lines
    let titleY = 600;
    for (let line of lines) {
        ctx.fillText(line, STORY_WIDTH/2, titleY);
        titleY += 60;
    }

    // Recipe details section
    const detailsY = titleY + 80;
    ctx.font = '32px Arial';
    ctx.textAlign = 'left';

    // Create details box
    const boxX = 100;
    const boxWidth = STORY_WIDTH - 200;
    const boxHeight = 200;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.roundRect(boxX, detailsY, boxWidth, boxHeight, 20);
    ctx.fill();

    // Details text
    ctx.fillStyle = '#ffffff';
    let detailY = detailsY + 40;

    if (recipe.prepTime) {
        ctx.fillText(`⏱️ Prep: ${formatTime(recipe.prepTime)}`, boxX + 30, detailY);
        detailY += 40;
    }

    if (recipe.cookTime) {
        ctx.fillText(`🔥 Cook: ${formatTime(recipe.cookTime)}`, boxX + 30, detailY);
        detailY += 40;
    }

    if (recipe.servings) {
        ctx.fillText(`👥 Serves: ${recipe.servings}`, boxX + 30, detailY);
        detailY += 40;
    }

    // App branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Doc Bear's Comfort Kitchen", STORY_WIDTH/2, STORY_HEIGHT - 150);

    ctx.font = '24px Arial';
    ctx.fillText('Get the full recipe at docbearscomfort.kitchen', STORY_WIDTH/2, STORY_HEIGHT - 100);

    // QR Code placeholder (you'd implement actual QR generation)
    if (includeQR) {
        const qrSize = 120;
        const qrX = STORY_WIDTH - qrSize - 50;
        const qrY = STORY_HEIGHT - qrSize - 50;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);

        ctx.fillStyle = '#000000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR Code', qrX + qrSize/2, qrY + qrSize/2);
    }
}

async function drawClassicTemplate(ctx, recipe, photos, includeQR) {
    // Warm background
    ctx.fillStyle = '#f7f3e9';
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    // Header section
    ctx.fillStyle = '#8b4513';
    ctx.fillRect(0, 0, STORY_WIDTH, 200);

    // App logo/name
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px serif';
    ctx.textAlign = 'center';
    ctx.fillText("Doc Bear's Comfort Kitchen", STORY_WIDTH/2, 80);

    ctx.font = '24px serif';
    ctx.fillText('Homestyle Recipes', STORY_WIDTH/2, 130);

    // Recipe photo (large, centered)
    if (photos.length > 0) {
        try {
            const primaryPhoto = photos[0];
            if (primaryPhoto.data) {
                const img = await loadImage(primaryPhoto.data);

                const photoWidth = STORY_WIDTH - 120;
                const photoHeight = 600;
                const photoX = 60;
                const photoY = 250;

                // Draw photo with rounded corners
                ctx.save();
                ctx.roundRect(photoX, photoY, photoWidth, photoHeight, 20);
                ctx.clip();

                const scale = Math.max(photoWidth / img.width, photoHeight / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const imgX = photoX + (photoWidth - scaledWidth) / 2;
                const imgY = photoY + (photoHeight - scaledHeight) / 2;

                ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                ctx.restore();

                // Add subtle shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
                ctx.shadowBlur = 10;
                ctx.shadowOffsetY = 5;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
                ctx.lineWidth = 2;
                ctx.roundRect(photoX, photoY, photoWidth, photoHeight, 20);
                ctx.stroke();
                ctx.shadowColor = 'transparent';
            }
        } catch (error) {
            console.error('Error loading photo for classic template:', error);
        }
    }

    // Recipe title
    ctx.fillStyle = '#2c1810';
    ctx.font = 'bold 44px serif';
    ctx.textAlign = 'center';

    // Word wrap title
    const words = recipe.title.split(' ');
    let lines = [];
    let currentLine = '';

    for (let word of words) {
        const testLine = currentLine + (currentLine ? ' ' : '') + word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > STORY_WIDTH - 120 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine);

    let titleY = 920;
    for (let line of lines) {
        ctx.fillText(line, STORY_WIDTH/2, titleY);
        titleY += 55;
    }

    // Recipe details in decorative box
    const detailsY = titleY + 60;
    ctx.fillStyle = '#fff8dc';
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;

    const boxX = 80;
    const boxWidth = STORY_WIDTH - 160;
    const boxHeight = 180;

    ctx.roundRect(boxX, detailsY, boxWidth, boxHeight, 15);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#2c1810';
    ctx.font = '28px serif';
    ctx.textAlign = 'left';

    let detailY = detailsY + 45;
    if (recipe.prepTime) {
        ctx.fillText(`⏱️ Prep Time: ${formatTime(recipe.prepTime)}`, boxX + 30, detailY);
        detailY += 45;
    }
    if (recipe.cookTime) {
        ctx.fillText(`🔥 Cook Time: ${formatTime(recipe.cookTime)}`, boxX + 30, detailY);
        detailY += 45;
    }
    if (recipe.servings) {
        ctx.fillText(`👥 Servings: ${recipe.servings}`, boxX + 30, detailY);
    }

    // Footer
    ctx.fillStyle = '#8b4513';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText('Find the complete recipe at docbearscomfort.kitchen', STORY_WIDTH/2, STORY_HEIGHT - 60);
}

async function drawMinimalTemplate(ctx, recipe, photos, includeQR) {
    // Clean white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

    // Minimal header
    ctx.fillStyle = '#000000';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('RECIPE', STORY_WIDTH/2, 100);

    // Large recipe photo
    if (photos.length > 0) {
        try {
            const primaryPhoto = photos[0];
            if (primaryPhoto.data) {
                const img = await loadImage(primaryPhoto.data);

                const photoSize = 800;
                const photoX = (STORY_WIDTH - photoSize) / 2;
                const photoY = 200;

                // Square crop
                ctx.save();
                ctx.rect(photoX, photoY, photoSize, photoSize);
                ctx.clip();

                const scale = Math.max(photoSize / img.width, photoSize / img.height);
                const scaledWidth = img.width * scale;
                const scaledHeight = img.height * scale;
                const imgX = photoX + (photoSize - scaledWidth) / 2;
                const imgY = photoY + (photoSize - scaledHeight) / 2;

                ctx.drawImage(img, imgX, imgY, scaledWidth, scaledHeight);
                ctx.restore();
            }
        } catch (error) {
            console.error('Error loading photo for minimal template:', error);
        }
    }

    // Recipe title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'center';

    // Simple title positioning
    const titleY = 1100;
    ctx.fillText(recipe.title, STORY_WIDTH/2, titleY);

    // Minimal details
    ctx.font = '24px Arial';
    const details = [];
    if (recipe.prepTime) details.push(`${formatTime(recipe.prepTime)} prep`);
    if (recipe.cookTime) details.push(`${formatTime(recipe.cookTime)} cook`);
    if (recipe.servings) details.push(`serves ${recipe.servings}`);

    if (details.length > 0) {
        ctx.fillText(details.join(' • '), STORY_WIDTH/2, titleY + 80);
    }

    // Simple footer
    ctx.font = '20px Arial';
    ctx.fillText('docbearscomfort.kitchen', STORY_WIDTH/2, STORY_HEIGHT - 100);
}

function formatTime(minutes) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function ensureRoundRectPolyfill() {
    if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
        CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
            this.beginPath();
            this.moveTo(x + radius, y);
            this.lineTo(x + width - radius, y);
            this.quadraticCurveTo(x + width, y, x + width, y + radius);
            this.lineTo(x + width, y + height - radius);
            this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
            this.lineTo(x + radius, y + height);
            this.quadraticCurveTo(x, y + height, x, y + height - radius);
            this.lineTo(x, y + radius);
            this.quadraticCurveTo(x, y, x + radius, y);
            this.closePath();
        };
    }
}