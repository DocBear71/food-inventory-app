// file: test-nextauth.js (in your root directory)
try {
    const nextAuth = require('next-auth');
    console.log('NextAuth:', Object.keys(nextAuth));

    const credentials = require('next-auth/providers/credentials');
    console.log('Credentials module:', Object.keys(credentials));
    console.log('Default export:', credentials.default);
    console.log('Named exports:', credentials);
} catch (error) {
    console.error('Error:', error.message);
}