import { useEffect, useMemo, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { api } from '@/lib/axios'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  SeparatorHorizontal,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from 'lucide-react'

export default function RichTextEditor({ value, onChange, placeholder = 'Write something…' }) {
  const fileRef = useRef(null)
  const initial = useMemo(() => value ?? '', [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Image.configure({ allowBase64: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initial,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-invert max-w-none focus:outline-none min-h-[260px] px-4 py-3',
      },
    },
  })

  useEffect(() => {
    if (!editor) return
    if (typeof value !== 'string') return
    const current = editor.getHTML()
    if (current === value) return
    editor.commands.setContent(value, false)
  }, [editor, value])

  async function onPickImage(e) {
    const file = e.target.files?.[0]
    if (!file || !editor) return
    const fd = new FormData()
    fd.append('image', file)
    const res = await api.post('/admin/articles/inline-image', fd)
    const url = res.data?.url
    if (url) editor.chain().focus().setImage({ src: url }).run()
    if (fileRef.current) fileRef.current.value = ''
  }

  function setLink() {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950">
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 bg-zinc-900/40 p-2">
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bold') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('italic') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('underline') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('strike') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-zinc-800" />
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('bulletList') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('orderedList') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor.isActive('blockquote') ? 'default' : 'secondary'}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <SeparatorHorizontal className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-zinc-800" />
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant={editor.isActive('link') ? 'default' : 'secondary'} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </Button>
        <div className="mx-1 h-6 w-px bg-zinc-800" />
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

