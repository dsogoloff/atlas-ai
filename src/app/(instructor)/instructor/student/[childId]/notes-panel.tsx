"use client";

// Pedagogical notes panel. Add a new note (when writable), and edit the
// instructor's own notes inline. Writes go through server actions, which
// re-run the auth + RLS gate; this component only collects text and reflects
// the result. After a successful write it calls router.refresh() so the
// server component re-reads the (revalidated) notes list.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createNote, updateNote } from "../../lib/actions";
import type { NoteView } from "../../lib/notes";

export function NotesPanel({
  childId,
  notes,
  canWrite,
}: {
  childId: string;
  notes: NoteView[];
  canWrite: boolean;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-display-child text-sam-navy text-2xl mb-1">
        Instructor notes
      </h2>
      <p className="text-sm text-sam-gray-mid mb-4">
        Private to center instructors — never shown to parents.
      </p>

      {canWrite ? (
        <NewNoteForm childId={childId} />
      ) : (
        <p className="text-sm text-sam-gray-mid bg-sam-gray-light/40 rounded-xl px-4 py-3 mb-4">
          This student is at another center within the grace window. You can
          read existing notes but can&rsquo;t add or edit them.
        </p>
      )}

      {notes.length === 0 ? (
        <p className="text-sm text-sam-gray-mid mt-4">No notes yet.</p>
      ) : (
        <ul className="space-y-3 mt-4">
          {notes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              childId={childId}
              editable={canWrite && note.mine}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function NewNoteForm({ childId }: { childId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createNote(childId, body);
      if (result.ok) {
        setBody("");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-sam-gray-light/40 p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a note about this student's placement or progress…"
        rows={3}
        className="w-full resize-y rounded-xl border border-sam-gray-light/60 px-3 py-2 text-sm text-sam-navy focus:outline-none focus:border-sam-navy"
      />
      {error && <p className="text-sm text-sam-red mt-2">{error}</p>}
      <div className="flex justify-end mt-3">
        <button
          type="button"
          onClick={submit}
          disabled={pending || body.trim().length === 0}
          className="px-5 py-2 rounded-xl bg-sam-navy text-white text-sm font-bold disabled:opacity-40 hover:opacity-95 transition-opacity"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
    </div>
  );
}

function NoteItem({
  note,
  childId,
  editable,
}: {
  note: NoteView;
  childId: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(note.body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateNote(note.id, childId, body);
      if (result.ok) {
        setEditing(false);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <li className="bg-white rounded-2xl border border-sam-gray-light/40 p-4">
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-[11px] uppercase tracking-wider text-sam-gray-mid">
          {note.mine ? "You" : "Center colleague"} · {note.createdAtDisplay}
        </span>
        {editable && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-bold text-sam-navy/60 hover:text-sam-red"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            className="w-full resize-y rounded-xl border border-sam-gray-light/60 px-3 py-2 text-sm text-sam-navy focus:outline-none focus:border-sam-navy"
          />
          {error && <p className="text-sm text-sam-red mt-2">{error}</p>}
          <div className="flex justify-end gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setBody(note.body);
                setError(null);
              }}
              className="px-4 py-2 rounded-xl text-sm font-bold text-sam-navy/60 hover:text-sam-navy"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || body.trim().length === 0}
              className="px-5 py-2 rounded-xl bg-sam-navy text-white text-sm font-bold disabled:opacity-40 hover:opacity-95 transition-opacity"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </>
      ) : (
        <p className="text-sm text-sam-navy/80 whitespace-pre-wrap">
          {note.body}
        </p>
      )}
    </li>
  );
}
