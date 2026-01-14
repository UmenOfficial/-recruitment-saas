'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { uploadContentImage } from './actions';

// Next.js dynamic import for Client Side Rendering Only
const ReactQuillDynamic = dynamic(() => import('react-quill-new'), {
    ssr: false,
    loading: () => <div className="h-64 bg-slate-50 animate-pulse rounded-lg" />,
});

interface EditorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function PostEditor({ value, onChange }: EditorProps) {
    const quillRef = useRef<ReactQuill>(null);

    const imageHandler = async () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files ? input.files[0] : null;
            if (file) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);

                    // Upload to Supabase
                    const url = await uploadContentImage(formData);

                    // Insert image into editor
                    const editor = quillRef.current?.getEditor();
                    const range = editor?.getSelection();
                    if (editor && range) {
                        editor.insertEmbed(range.index, 'image', url);
                    }
                } catch (error) {
                    console.error('Image upload failed', error);
                    alert('Image upload failed');
                }
            }
        };
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), []);

    // Cast to any to avoid ref type issues with dynamic import
    const QuillComponent = ReactQuillDynamic as any;

    return (
        <div className="h-[400px] mb-12 prose prose-slate max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0">
            <QuillComponent
                ref={quillRef}
                theme="snow"
                value={value}
                onChange={onChange}
                modules={modules}
                className="h-[350px]"
            />
        </div>
    );
}
