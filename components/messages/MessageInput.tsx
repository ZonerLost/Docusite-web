import React from 'react';
import { Formik, Form, Field } from 'formik';
import { PaperclipIcon, CameraIcon, SendIcon } from '@/components/ui/Icons';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';
import { messageSchema, MessageFormValues } from '@/lib/validation';

interface MessageInputProps {
  onSendMessage: (content: string) => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage }) => {
  const initialValues: MessageFormValues = {
    message: ''
  };

  const handleSubmit = (values: MessageFormValues, { setSubmitting, resetForm }: any) => {
    if (values.message.trim()) {
      onSendMessage(values.message);
      setSubmitting(false);
      resetForm();
    }
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={messageSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting }) => (
        <Form className="flex items-center space-x-2 sm:space-x-3">
          {/* Message Input */}
          <div className="flex-1 relative">
            <Field name="message">
              {({ field }: any) => (
                <FormInput
                  {...field}
                  label=""
                  placeholder="Type your message here..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-light-gray border border-border-gray rounded-xl text-sm sm:text-base text-black placeholder-placeholder-gray"
                />
              )}
            </Field>
          </div>
          
          {/* Action Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Paperclip Icon */}
            <button
              type="button"
              className="p-1.5 sm:p-2 text-placeholder-gray hover:text-text-gray transition-colors"
            >
              <PaperclipIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Camera Icon */}
            <button
              type="button"
              className="p-1.5 sm:p-2 text-placeholder-gray hover:text-text-gray transition-colors"
            >
              <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Send Button */}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="p-1.5 sm:p-3 rounded-xl"
              disabled={isSubmitting}
            >
              <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default MessageInput;
