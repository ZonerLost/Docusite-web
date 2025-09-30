import React from 'react';

const TermsTab: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      <div className="border border-border-gray shadow-sm rounded-xl">
        <div className="p-6 space-y-6">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-black mb-4">Terms of Service Agreement</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  Welcome to DocuSite! These Terms of Service ("Terms") govern your use of our document management platform and services. By accessing or using DocuSite, you agree to be bound by these Terms.
                </p>
                <p>
                  If you do not agree to these Terms, please do not use our services. We reserve the right to modify these Terms at any time, and your continued use of the service constitutes acceptance of any changes.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Acceptance of Terms</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  By creating an account or using DocuSite, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. You must be at least 18 years old to use our service, or have parental consent if you are between 13-17 years old.
                </p>
                <p>
                  If you are using DocuSite on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Service Description</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  DocuSite provides a cloud-based document management platform that allows users to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Upload, store, and organize documents and files</li>
                  <li>Collaborate on projects with team members</li>
                  <li>Track project progress and deadlines</li>
                  <li>Share documents securely with authorized users</li>
                  <li>Access documents from any device with internet connectivity</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">User Accounts and Responsibilities</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <div>
                  <h4 className="font-semibold text-black mb-2">Account Creation</h4>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>You must provide accurate and complete information when creating an account</li>
                    <li>You are responsible for maintaining the confidentiality of your account credentials</li>
                    <li>You must notify us immediately of any unauthorized use of your account</li>
                    <li>You are responsible for all activities that occur under your account</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-black mb-2">Prohibited Uses</h4>
                  <p>You agree not to use DocuSite to:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Upload or share illegal, harmful, or inappropriate content</li>
                    <li>Violate any laws or regulations</li>
                    <li>Infringe on intellectual property rights</li>
                    <li>Attempt to gain unauthorized access to our systems</li>
                    <li>Interfere with or disrupt our service</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Intellectual Property Rights</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  DocuSite and its original content, features, and functionality are owned by DocuSite Inc. and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                </p>
                <p>
                  You retain ownership of the documents and files you upload to DocuSite. By uploading content, you grant us a limited license to store, process, and display your content as necessary to provide our services.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Payment Terms</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  Some features of DocuSite may require payment. By subscribing to paid services, you agree to:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Pay all fees and charges associated with your subscription</li>
                  <li>Provide accurate billing information</li>
                  <li>Authorize us to charge your payment method for recurring fees</li>
                  <li>Notify us of any changes to your payment information</li>
                </ul>
                <p>
                  All fees are non-refundable unless otherwise specified. We reserve the right to change our pricing with 30 days' notice.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Service Availability and Modifications</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  We strive to maintain high service availability but cannot guarantee uninterrupted access. We may:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Perform scheduled maintenance that may temporarily affect service</li>
                  <li>Modify or discontinue features with reasonable notice</li>
                  <li>Suspend or terminate accounts that violate these Terms</li>
                  <li>Update our service to improve functionality and security</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Limitation of Liability</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  To the maximum extent permitted by law, DocuSite shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities.
                </p>
                <p>
                  Our total liability to you for any damages arising from or related to these Terms or our service shall not exceed the amount you paid us in the 12 months preceding the claim.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Termination</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  Either party may terminate this agreement at any time. Upon termination:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Your access to DocuSite will be suspended</li>
                  <li>You may export your data for 30 days after termination</li>
                  <li>We may delete your account and data after the export period</li>
                  <li>Provisions that should survive termination will remain in effect</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Contact Information</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  If you have any questions about these Terms of Service, please contact us at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> legal@docusite.com</p>
                  <p><strong>Address:</strong> DocuSite Legal Department, 123 Business Ave, Suite 100, City, State 12345</p>
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Last updated: {new Date().toLocaleDateString()}
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsTab;