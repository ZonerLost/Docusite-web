import React from 'react';
import { X, Bold, Italic, Underline, List, ListOrdered, Table, Link, Code } from 'lucide-react';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (note: string) => void;
  title?: string;
}

interface MemberOption {
  id: string;
  name: string;
  avatar?: string;
}

const DEFAULT_MEMBERS: MemberOption[] = [
  { id: '1', name: 'Mike Ross', avatar: '/avatar.png' },
  { id: '2', name: 'Harvey Specter', avatar: '/avatar.png' },
  { id: '3', name: 'Louis Litt', avatar: '/avatar.png' },
  { id: '4', name: 'Donna Paulsen', avatar: '/avatar.png' }
];

const NotesModal: React.FC<NotesModalProps> = ({ isOpen, onClose, onAdd, title = 'Add Notes' }) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const [draft, setDraft] = React.useState('');
  const editorRef = React.useRef<HTMLDivElement | null>(null);

  const [isMentionOpen, setIsMentionOpen] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [mentionStartIndex, setMentionStartIndex] = React.useState<number | null>(null);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const [members] = React.useState<MemberOption[]>(DEFAULT_MEMBERS);

  const filteredMembers = React.useMemo(() => {
    const query = mentionQuery.trim().toLowerCase();
    if (!query) return members;
    return members.filter(m => m.name.toLowerCase().includes(query));
  }, [mentionQuery, members]);

  const resetMentions = () => {
    setIsMentionOpen(false);
    setMentionQuery('');
    setMentionStartIndex(null);
    setHighlightIndex(0);
  };

  // Rich text editor functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertTable = () => {
    const tableHTML = `
      <table>
        <thead>
          <tr>
            <th>Header 1</th>
            <th>Header 2</th>
            <th>Header 3</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cell 1</td>
            <td>Cell 2</td>
            <td>Cell 3</td>
          </tr>
          <tr>
            <td>Cell 4</td>
            <td>Cell 5</td>
            <td>Cell 6</td>
          </tr>
        </tbody>
      </table>
    `;
    execCommand('insertHTML', tableHTML);
  };

  const insertCodeBlock = () => {
    const codeHTML = `
      <pre><code>// Enter your code here
console.log('Hello, World!');</code></pre>
    `;
    execCommand('insertHTML', codeHTML);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const clipboardData = e.clipboardData;
    const htmlData = clipboardData.getData('text/html');
    const textData = clipboardData.getData('text/plain');
    
    if (htmlData) {
      // Clean and sanitize HTML content while preserving structure
      let cleanHTML = htmlData
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^"]*">.*?<\/style>/gi, '')
        .replace(/on\w+="[^"]*"/gi, '')
        .replace(/data-start="[^"]*"/gi, '')
        .replace(/data-end="[^"]*"/gi, '')
        .replace(/style="[^"]*"/gi, '') // Remove all inline styles
        .replace(/class="[^"]*"/gi, (match) => {
          // Simplify complex class names
          if (match.includes('overflow-visible')) return 'class="code-block"';
          if (match.includes('contain-inline-size')) return 'class="code-container"';
          if (match.includes('rounded-2xl')) return 'class="code-wrapper"';
          if (match.includes('sticky')) return 'class="code-header"';
          if (match.includes('absolute')) return 'class="code-actions"';
          if (match.includes('flex')) return 'class="code-toolbar"';
          if (match.includes('bg-token')) return 'class="code-bg"';
          if (match.includes('text-token')) return 'class="code-text"';
          if (match.includes('overflow-y-auto')) return 'class="code-content"';
          if (match.includes('whitespace-pre')) return 'class="code-text"';
          if (match.includes('language-bash')) return 'class="code-bash"';
          if (match.includes('font-sans')) return 'class="code-font"';
          if (match.includes('text-xs')) return 'class="code-small"';
          if (match.includes('px-2')) return 'class="code-padding"';
          if (match.includes('rounded-sm')) return 'class="code-rounded"';
          if (match.includes('gap-4')) return 'class="code-gap"';
          if (match.includes('items-center')) return 'class="code-center"';
          if (match.includes('pe-2')) return 'class="code-end"';
          if (match.includes('h-9')) return 'class="code-height"';
          if (match.includes('end-0')) return 'class="code-end-pos"';
          if (match.includes('bottom-0')) return 'class="code-bottom"';
          if (match.includes('top-9')) return 'class="code-top"';
          if (match.includes('p-4')) return 'class="code-padding"';
          if (match.includes('dir="ltr"')) return 'class="code-ltr"';
          return 'class="clean-element"';
        });
      
      // Wrap complex structures in simpler containers
      cleanHTML = cleanHTML
        .replace(/<pre[^>]*>/gi, '<pre class="code-block">')
        .replace(/<code[^>]*>/gi, '<code class="code-text">')
        .replace(/<div[^>]*class="code-container"[^>]*>/gi, '<div class="code-container">')
        .replace(/<div[^>]*class="code-wrapper"[^>]*>/gi, '<div class="code-wrapper">');
      
      execCommand('insertHTML', cleanHTML);
    } else if (textData) {
      execCommand('insertText', textData);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      setDraft(editorRef.current.innerHTML);
    }
  };

  const updateMentionsStateFromText = (value: string, cursor: number) => {
    const leftText = value.slice(0, cursor);
    const match = leftText.match(/(^|[\s])@([^\s@]*)$/);
    if (match) {
      const atIndex = leftText.lastIndexOf('@');
      setIsMentionOpen(true);
      setMentionStartIndex(atIndex);
      setMentionQuery(match[2] || '');
      setHighlightIndex(0);
    } else {
      resetMentions();
    }
  };
  React.useEffect(() => {
    if (isOpen) {
      setDraft('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [isOpen]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleBackdropClick}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-border-gray relative">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Close notes">
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div className="px-5 py-6 overflow-y-auto max-h-[90vh]">
          <h2 className="text-xl font-semibold text-black mb-1">{title}</h2>
          <p className="text-sm text-text-gray mb-5">Add your notes to this annotation</p>
          
          {/* Rich Text Editor Toolbar */}
          <div className="rich-text-editor-toolbar border border-border-gray rounded-t-xl bg-gray-50 p-2 flex items-center gap-1 flex-wrap text-gray-700">
            <button
              type="button"
              onClick={() => execCommand('bold')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('italic')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('underline')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Underline"
            >
              <Underline className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => execCommand('insertUnorderedList')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => execCommand('insertOrderedList')}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={insertTable}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Insert Table"
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const url = prompt('Enter URL:');
                if (url) execCommand('createLink', url);
              }}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Insert Link"
            >
              <Link className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={insertCodeBlock}
              className="p-2 hover:bg-gray-200 rounded transition-colors"
              title="Insert Code Block"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          {/* Rich Text Editor */}
          <div className="relative">
            <div
              ref={editorRef}
              contentEditable
              className="rich-text-editor min-h-[200px] max-h-[400px] overflow-y-auto border border-border-gray border-t-0 rounded-b-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onInput={handleInput}
              onPaste={handlePaste}
              onKeyDown={(e) => {
                if (!isMentionOpen) return;
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.min(prev + 1, Math.max(0, filteredMembers.length - 1)));
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  setHighlightIndex((prev) => Math.max(prev - 1, 0));
                } else if (e.key === 'Enter') {
                  if (filteredMembers.length > 0) {
                    e.preventDefault();
                    const chosen = filteredMembers[highlightIndex] || filteredMembers[0];
                    if (chosen && mentionStartIndex !== null) {
                      const selection = window.getSelection();
                      if (selection && selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        const textNode = document.createTextNode(`@${chosen.name} `);
                        range.insertNode(textNode);
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);
                      }
                      resetMentions();
                    }
                  }
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  resetMentions();
                }
              }}
              onClick={(e) => {
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                  const range = selection.getRangeAt(0);
                  const textContent = editorRef.current?.textContent || '';
                  const cursor = range.startOffset;
                  updateMentionsStateFromText(textContent, cursor);
                }
              }}
              onBlur={() => {
                setTimeout(() => {
                  resetMentions();
                }, 150);
              }}
              suppressContentEditableWarning={true}
              style={{ 
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}
            >
              {draft ? (
                <div dangerouslySetInnerHTML={{ __html: draft }} />
              ) : (
                <div className="text-gray-500 pointer-events-none">Type your notes here...</div>
              )}
            </div>

            {isMentionOpen && (
              <div className="absolute left-0 right-0 mt-1 z-20 bg-white border border-border-gray rounded-xl shadow-lg overflow-hidden">
                {filteredMembers.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-text-gray">No matches</div>
                ) : (
                  <ul className="max-h-60 overflow-auto">
                    {filteredMembers.map((m, idx) => (
                      <li
                        key={m.id}
                        className={
                          'flex items-center gap-2 px-3 py-2 cursor-pointer text-sm ' +
                          (idx === highlightIndex ? 'bg-gray-100' : '')
                        }
                        onMouseEnter={() => setHighlightIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const selection = window.getSelection();
                          if (selection && selection.rangeCount > 0) {
                            const range = selection.getRangeAt(0);
                            range.deleteContents();
                            const textNode = document.createTextNode(`@${m.name} `);
                            range.insertNode(textNode);
                            range.setStartAfter(textNode);
                            range.setEndAfter(textNode);
                            selection.removeAllRanges();
                            selection.addRange(range);
                          }
                          resetMentions();
                        }}
                      >
                        <Avatar src={m.avatar || '/avatar.png'} alt={m.name} size="sm" />
                        <span className="text-black">{m.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div className="mt-5">
            <Button
              className="w-full"
              onClick={() => {
                const content = editorRef.current?.innerHTML || '';
                const textContent = editorRef.current?.textContent?.trim() || '';
                if (!textContent) return;
                onAdd(content);
                setDraft('');
                if (editorRef.current) {
                  editorRef.current.innerHTML = '';
                }
                onClose();
              }}
            >
              Add
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesModal;
