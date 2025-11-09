import React from 'react';
import { Formik, Form, Field } from 'formik';
import { PaperclipIcon, CameraIcon, SendIcon } from '@/components/ui/Icons';
import Button from '@/components/ui/Button';
import FormInput from '@/components/ui/FormInput';
import { messageSchema, MessageFormValues } from '@/lib/validation';
import { toast } from 'react-hot-toast';

interface MessageInputProps {
  onSendMessage: (
    payload:
      | { type: 'text'; content: string; replyTo?: string | null; replyText?: string | null; replySender?: string | null }
      | { type: 'image' | 'file'; file: File }
  ) => Promise<void> | void;
  disabled?: boolean;
  replyContext?: { id: string; text: string; sender: string } | null;
  onCancelReply?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({ onSendMessage, disabled, replyContext, onCancelReply }) => {
  const initialValues: MessageFormValues = {
    message: ''
  };

  const handleSubmit = async (values: MessageFormValues, { setSubmitting, resetForm }: any) => {
    if (values.message.trim()) {
      try {
        await onSendMessage({
          type: 'text',
          content: values.message,
          replyTo: replyContext?.id,
          replyText: replyContext?.text,
          replySender: replyContext?.sender,
        });
        resetForm();
        onCancelReply?.();
      } catch (e: any) {
        toast.error('Failed to send message');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={messageSchema}
      onSubmit={handleSubmit}
    >
      {({ isSubmitting }) => (
        <Form className="flex flex-col gap-2">
          {replyContext ? (
            <div className="flex items-start justify-between bg-light-gray border border-border-gray rounded-lg px-3 py-2">
              <div className="text-xs text-text-gray">
                <span className="font-medium">Replying to {replyContext.sender}: </span>
                <span className="break-all">{replyContext.text}</span>
              </div>
              <button
                type="button"
                onClick={() => onCancelReply?.()}
                className="ml-3 text-placeholder-gray hover:text-text-gray"
                aria-label="Cancel reply"
              >
                ×
              </button>
            </div>
          ) : null}
          <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Message Input */}
          <div className="flex-1 relative">
            <Field name="message">
              {({ field }: any) => (
                <FormInput
                  {...field}
                  label=""
                  placeholder="Type your message here..."
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-light-gray border border-border-gray rounded-xl text-sm sm:text-base text-black placeholder-placeholder-gray"
                  disabled={isSubmitting || disabled}
                />
              )}
            </Field>
          </div>
          
          {/* Action Icons */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Paperclip Icon */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting || disabled}
              className="p-1.5 sm:p-2 text-placeholder-gray hover:text-text-gray transition-colors disabled:opacity-50"
            >
              <PaperclipIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Camera Icon */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isSubmitting || disabled}
              className="p-1.5 sm:p-2 text-placeholder-gray hover:text-text-gray transition-colors disabled:opacity-50"
            >
              <CameraIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Send Button */}
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="p-1.5 sm:p-3 rounded-xl"
              disabled={isSubmitting || disabled}
            >
              <SendIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await onSendMessage({ type: 'file', file: f });
                } catch (err) {
                  toast.error('File upload failed');
                } finally {
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }
              }}
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  await onSendMessage({ type: 'image', file: f });
                } catch (err) {
                  toast.error('Image upload failed');
                } finally {
                  if (imageInputRef.current) imageInputRef.current.value = '';
                }
              }}
            />
          </div>
          </div>
        </Form>
      )}
    </Formik>
  );
};

export default MessageInput;
