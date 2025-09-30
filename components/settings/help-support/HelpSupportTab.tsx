import React, { useState } from 'react';
import ChatInterface from './ChatInterface';
import FAQSection from './FAQSection';

interface Message {
  id: string;
  type: "incoming" | "outgoing" | "date";
  content: string;
  timestamp: string;
  isRead?: boolean;
}

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isExpanded: boolean;
}

const HelpSupportTab: React.FC = () => {
  const [expandedFAQ, setExpandedFAQ] = useState('1');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'incoming',
      content: 'Hello! Welcome to DocuSite Customer Support. How can I help you today?',
      timestamp: '2:15 pm',
      isRead: true
    },
    {
      id: '2',
      type: 'outgoing',
      content: 'Hi! I\'m having trouble uploading a large PDF file to my project. It keeps failing.',
      timestamp: '2:16 pm',
      isRead: true
    },
    {
      id: '3',
      type: 'incoming',
      content: 'I understand your concern. For large files, we recommend checking your file size (max 50MB per file) and ensuring a stable internet connection. You can also try uploading in smaller batches.',
      timestamp: '2:17 pm',
      isRead: true
    }
  ]);

  const faqItems: FAQItem[] = [
    {
      id: '1',
      question: 'What is DocuSite?',
      answer: 'DocuSite is a comprehensive document management platform designed for teams and businesses. It allows you to organize, share, and collaborate on documents and projects efficiently. With features like project tracking, team collaboration, and secure file storage, DocuSite helps streamline your workflow.',
      isExpanded: true
    },
    {
      id: '2',
      question: 'How do I upload files to my project?',
      answer: 'To upload files, navigate to your project dashboard and click the "Upload" button or drag and drop files directly into the project area. Supported formats include PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, and image files. Maximum file size is 50MB per file.',
      isExpanded: false
    },
    {
      id: '3',
      question: 'Can I collaborate with team members on documents?',
      answer: 'Yes! DocuSite offers real-time collaboration features. You can invite team members to projects, assign tasks, leave comments, and track progress together. All changes are synchronized in real-time, ensuring everyone stays updated.',
      isExpanded: false
    },
    {
      id: '4',
      question: 'How do I change my password?',
      answer: 'Go to Settings > Account Settings and click on "Change Password". Enter your current password and your new password twice for confirmation. Your new password must be at least 8 characters long and include a mix of letters, numbers, and symbols.',
      isExpanded: false
    },
    {
      id: '5',
      question: 'What happens to my data if I cancel my subscription?',
      answer: 'Your data remains accessible for 30 days after cancellation. During this period, you can download your files and export your project data. After 30 days, your account and data will be permanently deleted. We recommend backing up important data before cancellation.',
      isExpanded: false
    },
    {
      id: '6',
      question: 'How can I export my project data?',
      answer: 'You can export your project data in multiple formats. Go to your project dashboard, click on the "Export" button, and choose your preferred format (PDF, ZIP, or CSV). This will include all documents, notes, and project metadata.',
      isExpanded: false
    },
    {
      id: '7',
      question: 'Is my data secure on DocuSite?',
      answer: 'Absolutely! We use enterprise-grade security measures including SSL encryption, secure data centers, and regular security audits. Your files are encrypted both in transit and at rest. We also comply with GDPR and other data protection regulations.',
      isExpanded: false
    },
    {
      id: '8',
      question: 'How do I invite team members to a project?',
      answer: 'Navigate to your project, click on "Project Settings" or "Members", then click "Add Member". Enter the email address of the person you want to invite and select their permission level (View, Edit, or Admin). They will receive an email invitation to join the project.',
      isExpanded: false
    },
    {
      id: '9',
      question: 'Can I access DocuSite on mobile devices?',
      answer: 'Yes! DocuSite is fully responsive and works on all modern mobile devices. You can access your projects, view documents, leave comments, and collaborate with your team from anywhere. We also offer native mobile apps for iOS and Android.',
      isExpanded: false
    },
    {
      id: '10',
      question: 'What are the storage limits for my account?',
      answer: 'Free accounts include 5GB of storage. Paid plans offer 100GB (Professional), 500GB (Business), and unlimited storage (Enterprise). You can upgrade your plan anytime from the Settings page. Additional storage can be purchased if needed.',
      isExpanded: false
    }
  ];

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? '' : id);
  };

  // Generate timestamp for new messages
  const getCurrentTimestamp = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Generate unique ID for new messages
  const generateMessageId = () => {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  };

  // Handle sending new messages
  const handleSendMessage = (content: string) => {
    if (content.trim()) {
      const newMessage: Message = {
        id: generateMessageId(),
        type: 'outgoing',
        content: content.trim(),
        timestamp: getCurrentTimestamp(),
        isRead: true
      };
      
      setMessages(prev => [...prev, newMessage]);
      
      // Simulate intelligent support responses based on keywords
      setTimeout(() => {
        let supportResponse: Message;
        const lowerContent = content.toLowerCase();

        if (lowerContent.includes('upload') || lowerContent.includes('file')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'For file upload issues, please check: 1) File size (max 50MB), 2) File format compatibility, 3) Internet connection. Try refreshing the page or using a different browser. If the issue persists, please share the specific error message.',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else if (lowerContent.includes('password') || lowerContent.includes('login')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'For login issues, try: 1) Reset your password using the "Forgot Password" link, 2) Clear your browser cache and cookies, 3) Check if Caps Lock is enabled. If you\'re still having trouble, I can help you reset your account.',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else if (lowerContent.includes('team') || lowerContent.includes('member') || lowerContent.includes('invite')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'To manage team members: 1) Go to Project Settings > Members, 2) Click "Add Member" and enter their email, 3) Choose permission level (View/Edit/Admin). They\'ll receive an email invitation. Need help with specific permissions?',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else if (lowerContent.includes('export') || lowerContent.includes('download')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'To export your data: 1) Go to your project dashboard, 2) Click the "Export" button, 3) Choose format (PDF/ZIP/CSV). Large exports may take a few minutes. For bulk exports, contact our support team for assistance.',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else if (lowerContent.includes('billing') || lowerContent.includes('payment') || lowerContent.includes('subscription')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'For billing questions: 1) Check your subscription status in Settings > Account, 2) View billing history and invoices, 3) Update payment methods. Need to upgrade/downgrade? I can guide you through the process.',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else if (lowerContent.includes('mobile') || lowerContent.includes('app')) {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'DocuSite works on all devices! Access via web browser on mobile or download our native apps (iOS/Android). Features include: project viewing, file access, team collaboration, and notifications. Need help with mobile setup?',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        } else {
          supportResponse = {
            id: generateMessageId(),
            type: 'incoming',
            content: 'Thank you for your message! I\'m here to help with any DocuSite questions. For immediate assistance, check our FAQ section on the right, or feel free to ask me anything specific about your account, projects, or features.',
            timestamp: getCurrentTimestamp(),
            isRead: true
          };
        }

        setMessages(prev => [...prev, supportResponse]);
      }, 1500);
    }
  };

  return (
    <div className="w-full">
      <div className=" shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 lg:flex-row">
          <ChatInterface messages={messages} onSendMessage={handleSendMessage} />
          <FAQSection 
            faqItems={faqItems}
            expandedFAQ={expandedFAQ}
            onToggleFAQ={toggleFAQ}
          />
        </div>
      </div>
    </div>
  );
};

export default HelpSupportTab;