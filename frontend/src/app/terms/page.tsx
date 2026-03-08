export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-3xl font-extrabold text-slate-900 mb-6 font-heading">Terms and Conditions</h1>
        
        <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
          <p className="text-sm text-slate-500 italic">Last updated: {new Date().toLocaleDateString()}</p>
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">1. Agreement to Terms</h2>
            <p>
              By accessing and using CivicPulse (the "Service"), you agree to be bound by these Terms and Conditions. If you disagree with any part of these terms, you may not access the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">2. Description of Service</h2>
            <p>
              CivicPulse provides an AI-powered legal rights assistant designed to analyze documents and provide general information. The Service is for educational and informational purposes only and does NOT constitute formal legal advice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">3. No Attorney-Client Relationship</h2>
            <p>
              Use of CivicPulse does not create an attorney-client relationship between you and CivicPulse, its creators, or its affiliates. Always consult with a qualified legal professional for specific legal issues or representation.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">4. Privacy and Data Security</h2>
            <p>
              We prioritize your privacy. Documents uploaded for analysis are processed securely and are not read by human operators. By using the Service, you consent to our data processing practices as outlined in our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">5. User Accounts</h2>
            <p>
              When you create an account, you must provide accurate information. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3">6. Modifications</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
