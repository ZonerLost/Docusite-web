import React from 'react';

const PrivacyTab: React.FC = () => {
  return (
    <div className="space-y-4 w-full">
      <div className="border border-border-gray shadow-sm rounded-xl">
        <div className="p-6 space-y-6">
          <div className="space-y-6">
            <section>
              <h3 className="text-xl font-bold text-black mb-4">Introduction</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  DocuSite ("we," "our," or "us") is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our document management platform.
                </p>
                <p>
                  By using DocuSite, you consent to the data practices described in this policy. We may update this Privacy Policy from time to time, and we will notify you of any material changes.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Information We Collect</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <div>
                  <h4 className="font-semibold text-black mb-2">Personal Information</h4>
                  <p>We collect information you provide directly to us, such as:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Name and email address when you create an account</li>
                    <li>Profile information and preferences</li>
                    <li>Documents and files you upload to our platform</li>
                    <li>Communications you send to us</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-black mb-2">Usage Information</h4>
                  <p>We automatically collect certain information about your use of our service:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Log data including IP address, browser type, and access times</li>
                    <li>Device information and operating system details</li>
                    <li>Features used and interactions with our platform</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">How We Use Your Information</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>We use the information we collect to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Provide, maintain, and improve our document management services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices, updates, and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze usage patterns and trends</li>
                  <li>Detect, prevent, and address technical issues and security concerns</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Information Sharing and Disclosure</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties except:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations or court orders</li>
                  <li>To protect our rights, property, or safety</li>
                  <li>In connection with a business transfer or merger</li>
                  <li>With trusted service providers who assist in our operations</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Data Security</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
                </p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Encryption of data in transit and at rest</li>
                  <li>Regular security assessments and updates</li>
                  <li>Access controls and authentication mechanisms</li>
                  <li>Employee training on data protection practices</li>
                </ul>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Your Rights and Choices</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>You have the right to:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your account and associated data</li>
                  <li>Opt out of certain communications</li>
                  <li>Request a copy of your data</li>
                  <li>Object to processing of your personal information</li>
                </ul>
                <p className="mt-4">
                  To exercise these rights, please contact us at privacy@docusite.com.
                </p>
              </div>
            </section>

            <section>
              <h3 className="text-xl font-bold text-black mb-4">Contact Us</h3>
              <div className="space-y-3 text-text-gray text-sm leading-relaxed">
                <p>
                  If you have any questions about this Privacy Policy or our data practices, please contact us at:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p><strong>Email:</strong> privacy@docusite.com</p>
                  <p><strong>Address:</strong> DocuSite Privacy Team, 123 Business Ave, Suite 100, City, State 12345</p>
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

export default PrivacyTab;