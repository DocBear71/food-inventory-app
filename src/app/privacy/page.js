// app/privacy/page.js
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';

export default function PrivacyPolicyPage() {
    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '2rem',
            minHeight: '100vh',
            backgroundColor: '#f8f9fa'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
            }}>
                <h1 style={{
                    color: '#2c3e50',
                    marginBottom: '2rem',
                    borderBottom: '2px solid #e74c3c',
                    paddingBottom: '1rem'
                }}>
                    Privacy Policy
                </h1>
                <PrivacyPolicy />
            </div>
        </div>
    );
}